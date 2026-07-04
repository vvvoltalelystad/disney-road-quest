-- Disney Music Quest v2.8
-- Laadt 100 actieve Disney-songs met gewone QR-codes naar Spotify.
-- Let op: de QR-code opent een exacte Spotify-zoekopdracht. Kies zo nodig het bovenste resultaat.

alter table public.dmq_songs
  drop constraint if exists dmq_songs_song_number_check;

alter table public.dmq_songs
  add constraint dmq_songs_song_number_check
  check (song_number between 1 and 100);

insert into public.dmq_songs
(song_number, label, title, film, year, artist, spotify_url, enabled)
values
(1, 'Song 001', 'Let It Go', 'Frozen', 2013, 'Idina Menzel', 'https://open.spotify.com/search/Let%20It%20Go%20Idina%20Menzel%20Frozen%20Disney', true),
(2, 'Song 002', 'Do You Want to Build a Snowman?', 'Frozen', 2013, 'Kristen Bell, Agatha Lee Monn, Katie Lopez', 'https://open.spotify.com/search/Do%20You%20Want%20to%20Build%20a%20Snowman%3F%20Kristen%20Bell%2C%20Agatha%20Lee%20Monn%2C%20Katie%20Lopez%20Frozen%20Disney', true),
(3, 'Song 003', 'For the First Time in Forever', 'Frozen', 2013, 'Kristen Bell, Idina Menzel', 'https://open.spotify.com/search/For%20the%20First%20Time%20in%20Forever%20Kristen%20Bell%2C%20Idina%20Menzel%20Frozen%20Disney', true),
(4, 'Song 004', 'Love Is an Open Door', 'Frozen', 2013, 'Kristen Bell, Santino Fontana', 'https://open.spotify.com/search/Love%20Is%20an%20Open%20Door%20Kristen%20Bell%2C%20Santino%20Fontana%20Frozen%20Disney', true),
(5, 'Song 005', 'Into the Unknown', 'Frozen II', 2019, 'Idina Menzel, AURORA', 'https://open.spotify.com/search/Into%20the%20Unknown%20Idina%20Menzel%2C%20AURORA%20Frozen%20II%20Disney', true),
(6, 'Song 006', 'Show Yourself', 'Frozen II', 2019, 'Idina Menzel, Evan Rachel Wood', 'https://open.spotify.com/search/Show%20Yourself%20Idina%20Menzel%2C%20Evan%20Rachel%20Wood%20Frozen%20II%20Disney', true),
(7, 'Song 007', 'Some Things Never Change', 'Frozen II', 2019, 'Frozen II Cast', 'https://open.spotify.com/search/Some%20Things%20Never%20Change%20Frozen%20II%20Cast%20Frozen%20II%20Disney', true),
(8, 'Song 008', 'Lost in the Woods', 'Frozen II', 2019, 'Jonathan Groff', 'https://open.spotify.com/search/Lost%20in%20the%20Woods%20Jonathan%20Groff%20Frozen%20II%20Disney', true),
(9, 'Song 009', 'Hakuna Matata', 'The Lion King', 1994, 'Nathan Lane, Ernie Sabella, Jason Weaver, Joseph Williams', 'https://open.spotify.com/search/Hakuna%20Matata%20Nathan%20Lane%2C%20Ernie%20Sabella%2C%20Jason%20Weaver%2C%20Joseph%20Williams%20The%20Lion%20King%20Disney', true),
(10, 'Song 010', 'Circle of Life', 'The Lion King', 1994, 'Carmen Twillie, Lebo M', 'https://open.spotify.com/search/Circle%20of%20Life%20Carmen%20Twillie%2C%20Lebo%20M%20The%20Lion%20King%20Disney', true),
(11, 'Song 011', 'I Just Can''t Wait to Be King', 'The Lion King', 1994, 'Jason Weaver, Rowan Atkinson, Laura Williams', 'https://open.spotify.com/search/I%20Just%20Can%27t%20Wait%20to%20Be%20King%20Jason%20Weaver%2C%20Rowan%20Atkinson%2C%20Laura%20Williams%20The%20Lion%20King%20Disney', true),
(12, 'Song 012', 'Can You Feel the Love Tonight', 'The Lion King', 1994, 'Joseph Williams, Sally Dworsky, Nathan Lane, Ernie Sabella, Kristle Edwards', 'https://open.spotify.com/search/Can%20You%20Feel%20the%20Love%20Tonight%20Joseph%20Williams%2C%20Sally%20Dworsky%2C%20Nathan%20Lane%2C%20Ernie%20Sabella%2C%20Kristle%20Edwards%20The%20Lion%20King%20Disney', true),
(13, 'Song 013', 'Be Prepared', 'The Lion King', 1994, 'Jeremy Irons', 'https://open.spotify.com/search/Be%20Prepared%20Jeremy%20Irons%20The%20Lion%20King%20Disney', true),
(14, 'Song 014', 'He Lives in You', 'The Lion King II: Simba''s Pride', 1998, 'Lebo M', 'https://open.spotify.com/search/He%20Lives%20in%20You%20Lebo%20M%20The%20Lion%20King%20II%3A%20Simba%27s%20Pride%20Disney', true),
(15, 'Song 015', 'A Whole New World', 'Aladdin', 1992, 'Brad Kane, Lea Salonga', 'https://open.spotify.com/search/A%20Whole%20New%20World%20Brad%20Kane%2C%20Lea%20Salonga%20Aladdin%20Disney', true),
(16, 'Song 016', 'Friend Like Me', 'Aladdin', 1992, 'Robin Williams', 'https://open.spotify.com/search/Friend%20Like%20Me%20Robin%20Williams%20Aladdin%20Disney', true),
(17, 'Song 017', 'Prince Ali', 'Aladdin', 1992, 'Robin Williams', 'https://open.spotify.com/search/Prince%20Ali%20Robin%20Williams%20Aladdin%20Disney', true),
(18, 'Song 018', 'Arabian Nights', 'Aladdin', 1992, 'Bruce Adler', 'https://open.spotify.com/search/Arabian%20Nights%20Bruce%20Adler%20Aladdin%20Disney', true),
(19, 'Song 019', 'Speechless', 'Aladdin', 2019, 'Naomi Scott', 'https://open.spotify.com/search/Speechless%20Naomi%20Scott%20Aladdin%20Disney', true),
(20, 'Song 020', 'Part of Your World', 'The Little Mermaid', 1989, 'Jodi Benson', 'https://open.spotify.com/search/Part%20of%20Your%20World%20Jodi%20Benson%20The%20Little%20Mermaid%20Disney', true),
(21, 'Song 021', 'Under the Sea', 'The Little Mermaid', 1989, 'Samuel E. Wright', 'https://open.spotify.com/search/Under%20the%20Sea%20Samuel%20E.%20Wright%20The%20Little%20Mermaid%20Disney', true),
(22, 'Song 022', 'Kiss the Girl', 'The Little Mermaid', 1989, 'Samuel E. Wright', 'https://open.spotify.com/search/Kiss%20the%20Girl%20Samuel%20E.%20Wright%20The%20Little%20Mermaid%20Disney', true),
(23, 'Song 023', 'Poor Unfortunate Souls', 'The Little Mermaid', 1989, 'Pat Carroll', 'https://open.spotify.com/search/Poor%20Unfortunate%20Souls%20Pat%20Carroll%20The%20Little%20Mermaid%20Disney', true),
(24, 'Song 024', 'For the First Time', 'The Little Mermaid', 2023, 'Halle Bailey', 'https://open.spotify.com/search/For%20the%20First%20Time%20Halle%20Bailey%20The%20Little%20Mermaid%20Disney', true),
(25, 'Song 025', 'How Far I''ll Go', 'Moana', 2016, 'Auli''i Cravalho', 'https://open.spotify.com/search/How%20Far%20I%27ll%20Go%20Auli%27i%20Cravalho%20Moana%20Disney', true),
(26, 'Song 026', 'You''re Welcome', 'Moana', 2016, 'Dwayne Johnson', 'https://open.spotify.com/search/You%27re%20Welcome%20Dwayne%20Johnson%20Moana%20Disney', true),
(27, 'Song 027', 'Shiny', 'Moana', 2016, 'Jemaine Clement', 'https://open.spotify.com/search/Shiny%20Jemaine%20Clement%20Moana%20Disney', true),
(28, 'Song 028', 'Where You Are', 'Moana', 2016, 'Moana Cast', 'https://open.spotify.com/search/Where%20You%20Are%20Moana%20Cast%20Moana%20Disney', true),
(29, 'Song 029', 'We Know the Way', 'Moana', 2016, 'Opetaia Foa''i, Lin-Manuel Miranda', 'https://open.spotify.com/search/We%20Know%20the%20Way%20Opetaia%20Foa%27i%2C%20Lin-Manuel%20Miranda%20Moana%20Disney', true),
(30, 'Song 030', 'We Don''t Talk About Bruno', 'Encanto', 2021, 'Encanto Cast', 'https://open.spotify.com/search/We%20Don%27t%20Talk%20About%20Bruno%20Encanto%20Cast%20Encanto%20Disney', true),
(31, 'Song 031', 'Surface Pressure', 'Encanto', 2021, 'Jessica Darrow', 'https://open.spotify.com/search/Surface%20Pressure%20Jessica%20Darrow%20Encanto%20Disney', true),
(32, 'Song 032', 'The Family Madrigal', 'Encanto', 2021, 'Stephanie Beatriz, Olga Merediz', 'https://open.spotify.com/search/The%20Family%20Madrigal%20Stephanie%20Beatriz%2C%20Olga%20Merediz%20Encanto%20Disney', true),
(33, 'Song 033', 'What Else Can I Do?', 'Encanto', 2021, 'Diane Guerrero, Stephanie Beatriz', 'https://open.spotify.com/search/What%20Else%20Can%20I%20Do%3F%20Diane%20Guerrero%2C%20Stephanie%20Beatriz%20Encanto%20Disney', true),
(34, 'Song 034', 'Waiting on a Miracle', 'Encanto', 2021, 'Stephanie Beatriz', 'https://open.spotify.com/search/Waiting%20on%20a%20Miracle%20Stephanie%20Beatriz%20Encanto%20Disney', true),
(35, 'Song 035', 'All of You', 'Encanto', 2021, 'Encanto Cast', 'https://open.spotify.com/search/All%20of%20You%20Encanto%20Cast%20Encanto%20Disney', true),
(36, 'Song 036', 'Remember Me', 'Coco', 2017, 'Coco Cast', 'https://open.spotify.com/search/Remember%20Me%20Coco%20Cast%20Coco%20Disney', true),
(37, 'Song 037', 'Un Poco Loco', 'Coco', 2017, 'Anthony Gonzalez, Gael García Bernal', 'https://open.spotify.com/search/Un%20Poco%20Loco%20Anthony%20Gonzalez%2C%20Gael%20Garc%C3%ADa%20Bernal%20Coco%20Disney', true),
(38, 'Song 038', 'The World Es Mi Familia', 'Coco', 2017, 'Anthony Gonzalez, Antonio Sol', 'https://open.spotify.com/search/The%20World%20Es%20Mi%20Familia%20Anthony%20Gonzalez%2C%20Antonio%20Sol%20Coco%20Disney', true),
(39, 'Song 039', 'Proud Corazón', 'Coco', 2017, 'Anthony Gonzalez', 'https://open.spotify.com/search/Proud%20Coraz%C3%B3n%20Anthony%20Gonzalez%20Coco%20Disney', true),
(40, 'Song 040', 'You''ve Got a Friend in Me', 'Toy Story', 1995, 'Randy Newman', 'https://open.spotify.com/search/You%27ve%20Got%20a%20Friend%20in%20Me%20Randy%20Newman%20Toy%20Story%20Disney', true),
(41, 'Song 041', 'When She Loved Me', 'Toy Story 2', 1999, 'Sarah McLachlan', 'https://open.spotify.com/search/When%20She%20Loved%20Me%20Sarah%20McLachlan%20Toy%20Story%202%20Disney', true),
(42, 'Song 042', 'We Belong Together', 'Toy Story 3', 2010, 'Randy Newman', 'https://open.spotify.com/search/We%20Belong%20Together%20Randy%20Newman%20Toy%20Story%203%20Disney', true),
(43, 'Song 043', 'I See the Light', 'Tangled', 2010, 'Mandy Moore, Zachary Levi', 'https://open.spotify.com/search/I%20See%20the%20Light%20Mandy%20Moore%2C%20Zachary%20Levi%20Tangled%20Disney', true),
(44, 'Song 044', 'When Will My Life Begin?', 'Tangled', 2010, 'Mandy Moore', 'https://open.spotify.com/search/When%20Will%20My%20Life%20Begin%3F%20Mandy%20Moore%20Tangled%20Disney', true),
(45, 'Song 045', 'Mother Knows Best', 'Tangled', 2010, 'Donna Murphy', 'https://open.spotify.com/search/Mother%20Knows%20Best%20Donna%20Murphy%20Tangled%20Disney', true),
(46, 'Song 046', 'I''ve Got a Dream', 'Tangled', 2010, 'Tangled Cast', 'https://open.spotify.com/search/I%27ve%20Got%20a%20Dream%20Tangled%20Cast%20Tangled%20Disney', true),
(47, 'Song 047', 'Be Our Guest', 'Beauty and the Beast', 1991, 'Jerry Orbach, Angela Lansbury', 'https://open.spotify.com/search/Be%20Our%20Guest%20Jerry%20Orbach%2C%20Angela%20Lansbury%20Beauty%20and%20the%20Beast%20Disney', true),
(48, 'Song 048', 'Beauty and the Beast', 'Beauty and the Beast', 1991, 'Angela Lansbury', 'https://open.spotify.com/search/Beauty%20and%20the%20Beast%20Angela%20Lansbury%20Beauty%20and%20the%20Beast%20Disney', true),
(49, 'Song 049', 'Belle', 'Beauty and the Beast', 1991, 'Beauty and the Beast Cast', 'https://open.spotify.com/search/Belle%20Beauty%20and%20the%20Beast%20Cast%20Beauty%20and%20the%20Beast%20Disney', true),
(50, 'Song 050', 'Gaston', 'Beauty and the Beast', 1991, 'Jesse Corti, Richard White', 'https://open.spotify.com/search/Gaston%20Jesse%20Corti%2C%20Richard%20White%20Beauty%20and%20the%20Beast%20Disney', true),
(51, 'Song 051', 'Something There', 'Beauty and the Beast', 1991, 'Beauty and the Beast Cast', 'https://open.spotify.com/search/Something%20There%20Beauty%20and%20the%20Beast%20Cast%20Beauty%20and%20the%20Beast%20Disney', true),
(52, 'Song 052', 'I''ll Make a Man Out of You', 'Mulan', 1998, 'Donny Osmond', 'https://open.spotify.com/search/I%27ll%20Make%20a%20Man%20Out%20of%20You%20Donny%20Osmond%20Mulan%20Disney', true),
(53, 'Song 053', 'Reflection', 'Mulan', 1998, 'Lea Salonga', 'https://open.spotify.com/search/Reflection%20Lea%20Salonga%20Mulan%20Disney', true),
(54, 'Song 054', 'Honor to Us All', 'Mulan', 1998, 'Mulan Cast', 'https://open.spotify.com/search/Honor%20to%20Us%20All%20Mulan%20Cast%20Mulan%20Disney', true),
(55, 'Song 055', 'A Girl Worth Fighting For', 'Mulan', 1998, 'Mulan Cast', 'https://open.spotify.com/search/A%20Girl%20Worth%20Fighting%20For%20Mulan%20Cast%20Mulan%20Disney', true),
(56, 'Song 056', 'Go the Distance', 'Hercules', 1997, 'Roger Bart', 'https://open.spotify.com/search/Go%20the%20Distance%20Roger%20Bart%20Hercules%20Disney', true),
(57, 'Song 057', 'Zero to Hero', 'Hercules', 1997, 'The Muses', 'https://open.spotify.com/search/Zero%20to%20Hero%20The%20Muses%20Hercules%20Disney', true),
(58, 'Song 058', 'I Won''t Say (I''m in Love)', 'Hercules', 1997, 'Susan Egan', 'https://open.spotify.com/search/I%20Won%27t%20Say%20%28I%27m%20in%20Love%29%20Susan%20Egan%20Hercules%20Disney', true),
(59, 'Song 059', 'The Gospel Truth', 'Hercules', 1997, 'The Muses', 'https://open.spotify.com/search/The%20Gospel%20Truth%20The%20Muses%20Hercules%20Disney', true),
(60, 'Song 060', 'Colors of the Wind', 'Pocahontas', 1995, 'Judy Kuhn', 'https://open.spotify.com/search/Colors%20of%20the%20Wind%20Judy%20Kuhn%20Pocahontas%20Disney', true),
(61, 'Song 061', 'Just Around the Riverbend', 'Pocahontas', 1995, 'Judy Kuhn', 'https://open.spotify.com/search/Just%20Around%20the%20Riverbend%20Judy%20Kuhn%20Pocahontas%20Disney', true),
(62, 'Song 062', 'Savages', 'Pocahontas', 1995, 'Pocahontas Cast', 'https://open.spotify.com/search/Savages%20Pocahontas%20Cast%20Pocahontas%20Disney', true),
(63, 'Song 063', 'Almost There', 'The Princess and the Frog', 2009, 'Anika Noni Rose', 'https://open.spotify.com/search/Almost%20There%20Anika%20Noni%20Rose%20The%20Princess%20and%20the%20Frog%20Disney', true),
(64, 'Song 064', 'Friends on the Other Side', 'The Princess and the Frog', 2009, 'Keith David', 'https://open.spotify.com/search/Friends%20on%20the%20Other%20Side%20Keith%20David%20The%20Princess%20and%20the%20Frog%20Disney', true),
(65, 'Song 065', 'Dig a Little Deeper', 'The Princess and the Frog', 2009, 'Jenifer Lewis', 'https://open.spotify.com/search/Dig%20a%20Little%20Deeper%20Jenifer%20Lewis%20The%20Princess%20and%20the%20Frog%20Disney', true),
(66, 'Song 066', 'Down in New Orleans', 'The Princess and the Frog', 2009, 'Dr. John', 'https://open.spotify.com/search/Down%20in%20New%20Orleans%20Dr.%20John%20The%20Princess%20and%20the%20Frog%20Disney', true),
(67, 'Song 067', 'The Bare Necessities', 'The Jungle Book', 1967, 'Phil Harris, Bruce Reitherman', 'https://open.spotify.com/search/The%20Bare%20Necessities%20Phil%20Harris%2C%20Bruce%20Reitherman%20The%20Jungle%20Book%20Disney', true),
(68, 'Song 068', 'I Wan''na Be Like You', 'The Jungle Book', 1967, 'Louis Prima, Phil Harris', 'https://open.spotify.com/search/I%20Wan%27na%20Be%20Like%20You%20Louis%20Prima%2C%20Phil%20Harris%20The%20Jungle%20Book%20Disney', true),
(69, 'Song 069', 'Trust in Me', 'The Jungle Book', 1967, 'Sterling Holloway', 'https://open.spotify.com/search/Trust%20in%20Me%20Sterling%20Holloway%20The%20Jungle%20Book%20Disney', true),
(70, 'Song 070', 'Everybody Wants to Be a Cat', 'The Aristocats', 1970, 'The Aristocats Cast', 'https://open.spotify.com/search/Everybody%20Wants%20to%20Be%20a%20Cat%20The%20Aristocats%20Cast%20The%20Aristocats%20Disney', true),
(71, 'Song 071', 'Thomas O''Malley Cat', 'The Aristocats', 1970, 'Phil Harris', 'https://open.spotify.com/search/Thomas%20O%27Malley%20Cat%20Phil%20Harris%20The%20Aristocats%20Disney', true),
(72, 'Song 072', 'Cruella De Vil', 'One Hundred and One Dalmatians', 1961, 'Bill Lee', 'https://open.spotify.com/search/Cruella%20De%20Vil%20Bill%20Lee%20One%20Hundred%20and%20One%20Dalmatians%20Disney', true),
(73, 'Song 073', 'When You Wish Upon a Star', 'Pinocchio', 1940, 'Cliff Edwards', 'https://open.spotify.com/search/When%20You%20Wish%20Upon%20a%20Star%20Cliff%20Edwards%20Pinocchio%20Disney', true),
(74, 'Song 074', 'I''ve Got No Strings', 'Pinocchio', 1940, 'Dickie Jones', 'https://open.spotify.com/search/I%27ve%20Got%20No%20Strings%20Dickie%20Jones%20Pinocchio%20Disney', true),
(75, 'Song 075', 'Heigh-Ho', 'Snow White and the Seven Dwarfs', 1937, 'The Dwarf Chorus', 'https://open.spotify.com/search/Heigh-Ho%20The%20Dwarf%20Chorus%20Snow%20White%20and%20the%20Seven%20Dwarfs%20Disney', true),
(76, 'Song 076', 'Someday My Prince Will Come', 'Snow White and the Seven Dwarfs', 1937, 'Adriana Caselotti', 'https://open.spotify.com/search/Someday%20My%20Prince%20Will%20Come%20Adriana%20Caselotti%20Snow%20White%20and%20the%20Seven%20Dwarfs%20Disney', true),
(77, 'Song 077', 'Whistle While You Work', 'Snow White and the Seven Dwarfs', 1937, 'Adriana Caselotti', 'https://open.spotify.com/search/Whistle%20While%20You%20Work%20Adriana%20Caselotti%20Snow%20White%20and%20the%20Seven%20Dwarfs%20Disney', true),
(78, 'Song 078', 'A Dream Is a Wish Your Heart Makes', 'Cinderella', 1950, 'Ilene Woods', 'https://open.spotify.com/search/A%20Dream%20Is%20a%20Wish%20Your%20Heart%20Makes%20Ilene%20Woods%20Cinderella%20Disney', true),
(79, 'Song 079', 'Bibbidi-Bobbidi-Boo', 'Cinderella', 1950, 'Verna Felton', 'https://open.spotify.com/search/Bibbidi-Bobbidi-Boo%20Verna%20Felton%20Cinderella%20Disney', true),
(80, 'Song 080', 'Once Upon a Dream', 'Sleeping Beauty', 1959, 'Mary Costa, Bill Shirley', 'https://open.spotify.com/search/Once%20Upon%20a%20Dream%20Mary%20Costa%2C%20Bill%20Shirley%20Sleeping%20Beauty%20Disney', true),
(81, 'Song 081', 'The Siamese Cat Song', 'Lady and the Tramp', 1955, 'Peggy Lee', 'https://open.spotify.com/search/The%20Siamese%20Cat%20Song%20Peggy%20Lee%20Lady%20and%20the%20Tramp%20Disney', true),
(82, 'Song 082', 'He''s a Tramp', 'Lady and the Tramp', 1955, 'Peggy Lee', 'https://open.spotify.com/search/He%27s%20a%20Tramp%20Peggy%20Lee%20Lady%20and%20the%20Tramp%20Disney', true),
(83, 'Song 083', 'Bella Notte', 'Lady and the Tramp', 1955, 'George Givot', 'https://open.spotify.com/search/Bella%20Notte%20George%20Givot%20Lady%20and%20the%20Tramp%20Disney', true),
(84, 'Song 084', 'The Wonderful Thing About Tiggers', 'The Many Adventures of Winnie the Pooh', 1977, 'Paul Winchell', 'https://open.spotify.com/search/The%20Wonderful%20Thing%20About%20Tiggers%20Paul%20Winchell%20The%20Many%20Adventures%20of%20Winnie%20the%20Pooh%20Disney', true),
(85, 'Song 085', 'Winnie the Pooh', 'Winnie the Pooh and the Honey Tree', 1966, 'Disney Chorus', 'https://open.spotify.com/search/Winnie%20the%20Pooh%20Disney%20Chorus%20Winnie%20the%20Pooh%20and%20the%20Honey%20Tree%20Disney', true),
(86, 'Song 086', 'Oo-De-Lally', 'Robin Hood', 1973, 'Roger Miller', 'https://open.spotify.com/search/Oo-De-Lally%20Roger%20Miller%20Robin%20Hood%20Disney', true),
(87, 'Song 087', 'Love', 'Robin Hood', 1973, 'Nancy Adams', 'https://open.spotify.com/search/Love%20Nancy%20Adams%20Robin%20Hood%20Disney', true),
(88, 'Song 088', 'Why Should I Worry?', 'Oliver & Company', 1988, 'Billy Joel', 'https://open.spotify.com/search/Why%20Should%20I%20Worry%3F%20Billy%20Joel%20Oliver%20%26%20Company%20Disney', true),
(89, 'Song 089', 'Once Upon a Time in New York City', 'Oliver & Company', 1988, 'Huey Lewis', 'https://open.spotify.com/search/Once%20Upon%20a%20Time%20in%20New%20York%20City%20Huey%20Lewis%20Oliver%20%26%20Company%20Disney', true),
(90, 'Song 090', 'Best of Friends', 'The Fox and the Hound', 1981, 'Pearl Bailey', 'https://open.spotify.com/search/Best%20of%20Friends%20Pearl%20Bailey%20The%20Fox%20and%20the%20Hound%20Disney', true),
(91, 'Song 091', 'The Mob Song', 'Beauty and the Beast', 1991, 'Beauty and the Beast Cast', 'https://open.spotify.com/search/The%20Mob%20Song%20Beauty%20and%20the%20Beast%20Cast%20Beauty%20and%20the%20Beast%20Disney', true),
(92, 'Song 092', 'One Jump Ahead', 'Aladdin', 1992, 'Brad Kane', 'https://open.spotify.com/search/One%20Jump%20Ahead%20Brad%20Kane%20Aladdin%20Disney', true),
(93, 'Song 093', 'Out There', 'The Hunchback of Notre Dame', 1996, 'Tom Hulce', 'https://open.spotify.com/search/Out%20There%20Tom%20Hulce%20The%20Hunchback%20of%20Notre%20Dame%20Disney', true),
(94, 'Song 094', 'Hellfire', 'The Hunchback of Notre Dame', 1996, 'Tony Jay', 'https://open.spotify.com/search/Hellfire%20Tony%20Jay%20The%20Hunchback%20of%20Notre%20Dame%20Disney', true),
(95, 'Song 095', 'The Bells of Notre Dame', 'The Hunchback of Notre Dame', 1996, 'Paul Kandel, David Ogden Stiers', 'https://open.spotify.com/search/The%20Bells%20of%20Notre%20Dame%20Paul%20Kandel%2C%20David%20Ogden%20Stiers%20The%20Hunchback%20of%20Notre%20Dame%20Disney', true),
(96, 'Song 096', 'Strangers Like Me', 'Tarzan', 1999, 'Phil Collins', 'https://open.spotify.com/search/Strangers%20Like%20Me%20Phil%20Collins%20Tarzan%20Disney', true),
(97, 'Song 097', 'You''ll Be in My Heart', 'Tarzan', 1999, 'Phil Collins', 'https://open.spotify.com/search/You%27ll%20Be%20in%20My%20Heart%20Phil%20Collins%20Tarzan%20Disney', true),
(98, 'Song 098', 'Son of Man', 'Tarzan', 1999, 'Phil Collins', 'https://open.spotify.com/search/Son%20of%20Man%20Phil%20Collins%20Tarzan%20Disney', true),
(99, 'Song 099', 'Two Worlds', 'Tarzan', 1999, 'Phil Collins', 'https://open.spotify.com/search/Two%20Worlds%20Phil%20Collins%20Tarzan%20Disney', true),
(100, 'Song 100', 'Try Everything', 'Zootopia', 2016, 'Shakira', 'https://open.spotify.com/search/Try%20Everything%20Shakira%20Zootopia%20Disney', true)
on conflict (song_number) do update set
  label = excluded.label,
  title = excluded.title,
  film = excluded.film,
  year = excluded.year,
  artist = excluded.artist,
  spotify_url = excluded.spotify_url,
  code_image_url = null,
  enabled = true,
  updated_at = now();

delete from public.dmq_songs where song_number > 100;

select count(*) as actieve_songs
from public.dmq_songs
where enabled = true
  and title is not null
  and film is not null
  and year is not null
  and spotify_url is not null;
