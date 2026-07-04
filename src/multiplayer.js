import { supabase } from './supabaseClient';

// Helper to generate a 4-letter uppercase room code
export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game room and add the host as the first player
export async function createRoom(gameMode, gameVersion, roundsPerPlayer, hostName) {
  const code = generateRoomCode();
  
  // Insert the room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      code,
      status: 'lobby',
      game_mode: gameMode,
      game_version: gameVersion,
      rounds_per_player: roundsPerPlayer,
      current_player_index: 0,
      round: 0,
      total_rounds: 0,
      current_task_id: null,
      current_task_state: { usedTasks: [], taskHistory: [] }
    })
    .select()
    .single();

  if (roomError) throw roomError;

  // Insert the host player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      name: hostName.trim()
    })
    .select()
    .single();

  if (playerError) {
    // Clean up room if player fails
    await supabase.from('rooms').delete().eq('id', room.id);
    throw playerError;
  }

  return { room, player };
}

// Join an existing room
export async function joinRoom(roomCode, playerName) {
  const cleanCode = roomCode.trim().toUpperCase();

  // Find the room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select()
    .eq('code', cleanCode)
    .eq('status', 'lobby')
    .single();

  if (roomError) {
    throw new Error("Kamer niet gevonden of het spel is al gestart.");
  }

  // Check if player name already exists in this room
  const { data: existingPlayers } = await supabase
    .from('players')
    .select('name')
    .eq('room_id', room.id);

  if (existingPlayers?.some(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
    throw new Error("Deze naam is al in gebruik in deze kamer.");
  }

  // Insert the player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      name: playerName.trim()
    })
    .select()
    .single();

  if (playerError) throw playerError;

  return { room, player };
}

// Fetch current room state and players list
export async function fetchRoomData(roomId) {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select()
    .eq('id', roomId)
    .single();

  if (roomError) throw roomError;

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select()
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (playersError) throw playersError;

  const { data: scoreHistory, error: historyError } = await supabase
    .from('score_history')
    .select()
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (historyError) throw historyError;

  return { room, players, scoreHistory };
}

// Subscribe to real-time updates for a room, its players, and its score history
export function subscribeToRoom(roomId, onUpdate) {
  const channel = supabase.channel(`room:${roomId}`)
    // Listen to changes on the rooms table
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rooms',
      filter: `id=eq.${roomId}`
    }, async () => {
      onUpdate();
    })
    // Listen to all changes on the players table for this room
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `room_id=eq.${roomId}`
    }, async () => {
      onUpdate();
    })
    // Listen to changes on the score_history table for this room
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'score_history',
      filter: `room_id=eq.${roomId}`
    }, async () => {
      onUpdate();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Update the room state
export async function updateRoomState(roomId, updates) {
  const { error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', roomId);
  
  if (error) throw error;
}

// Add points to a player (and log in history)
export async function addPlayerScore(roomId, player, delta, reason, bucket, task = null) {
  const newScore = (player.score || 0) + delta;
  const newKnowledge = (player.knowledge || 0) + (bucket === 'knowledge' ? delta : 0);
  const newCreative = (player.creative || 0) + (bucket === 'creative' ? delta : 0);

  // 1. Update player stats
  const { error: playerError } = await supabase
    .from('players')
    .update({
      score: newScore,
      knowledge: newKnowledge,
      creative: newCreative
    })
    .eq('id', player.id);

  if (playerError) throw playerError;

  // 2. Insert score history entry
  const { error: historyError } = await supabase
    .from('score_history')
    .insert({
      room_id: roomId,
      player_id: player.id,
      player_name: player.name,
      delta,
      reason,
      bucket
    });

  if (historyError) throw historyError;
}

// Adjust an existing score history entry (and update player's total score)
export async function adjustScoreEntry(roomId, entry, change) {
  const amount = Number(change);
  if (!Number.isFinite(amount) || amount === 0) return;

  const newDelta = entry.delta + amount;

  // 1. Fetch current player stats
  const { data: player, error: playerFetchError } = await supabase
    .from('players')
    .select()
    .eq('id', entry.player_id)
    .single();

  if (playerFetchError) throw playerFetchError;

  const newScore = player.score + amount;
  const newKnowledge = player.knowledge + (entry.bucket === 'knowledge' ? amount : 0);
  const newCreative = player.creative + (entry.bucket === 'creative' ? amount : 0);

  // 2. Update player stats
  const { error: playerError } = await supabase
    .from('players')
    .update({
      score: newScore,
      knowledge: newKnowledge,
      creative: newCreative
    })
    .eq('id', entry.player_id);

  if (playerError) throw playerError;

  // 3. Update history entry
  const { error: historyError } = await supabase
    .from('score_history')
    .update({
      delta: newDelta
    })
    .eq('id', entry.id);

  if (historyError) throw historyError;
}

// Remove/Undo a score history entry (and deduct from player's total score)
export async function removeScoreEntry(roomId, entry) {
  // 1. Fetch current player stats
  const { data: player, error: playerFetchError } = await supabase
    .from('players')
    .select()
    .eq('id', entry.player_id)
    .single();

  if (playerFetchError) throw playerFetchError;

  const newScore = player.score - entry.delta;
  const newKnowledge = player.knowledge - (entry.bucket === 'knowledge' ? entry.delta : 0);
  const newCreative = player.creative - (entry.bucket === 'creative' ? entry.delta : 0);

  // 2. Update player stats
  const { error: playerError } = await supabase
    .from('players')
    .update({
      score: newScore,
      knowledge: newKnowledge,
      creative: newCreative
    })
    .eq('id', entry.player_id);

  if (playerError) throw playerError;

  // 3. Delete history entry
  const { error: historyError } = await supabase
    .from('score_history')
    .delete()
    .eq('id', entry.id);

  if (historyError) throw historyError;
}
