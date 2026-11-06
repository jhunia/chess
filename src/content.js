/* Original bots, tutors, lessons and drills. Lesson moves are checked by tools/verify.js. */
function bot(id, name, rating, group, blurb, c, cfg, say) {
  return Object.assign({ id: id, name: name, rating: rating, group: group, blurb: blurb, color: c, say: say || {} }, cfg);
}
var BOTS = [
  bot('pip', 'Pip', 250, 'Beginner', 'A curious sparrow of a player who just learned how the horse moves.', '#7fb069', { depth: 1, multipv: 12, temp: 260, blunder: .42, book: .2 }, { hi: 'Hi! Is the horsey the one that hops?', win: 'I won? Wow! Did you let me?', lose: 'Good game! I will practise my hops.' }),
  bot('nia', 'Nia', 400, 'Beginner', 'Loves pawns. Forgets about her queen now and then.', '#e6aa68', { depth: 1, multipv: 10, temp: 170, blunder: .3, book: .3 }, { hi: 'Let us see whose pawns get across first.', win: 'My pawns did it!', lose: 'You spotted everything. Well played.' }),
  bot('otis', 'Otis', 550, 'Beginner', 'Grabs anything left undefended and hopes for the best.', '#c97b63', { depth: 2, multipv: 10, temp: 140, blunder: .24, book: .4, capture: 60 }, { hi: 'If it is free, I am taking it.', win: 'Free pieces win games!', lose: 'Fine, some of those were traps.' }),
  bot('june', 'June', 700, 'Beginner', 'Plays sensible opening moves, then gets distracted.', '#9c89b8', { depth: 2, multipv: 8, temp: 100, blunder: .17, book: .6 }, { hi: 'Knights out, bishops out, and then we will see.', win: 'That went better than planned.', lose: 'You kept your pieces safer than I did.' }),
  bot('marek', 'Marek', 900, 'Intermediate', 'A club regular who likes simple threats.', '#5b8e7d', { depth: 2, multipv: 8, temp: 70, blunder: .12, book: .7 }, { hi: 'Watch your back rank tonight.', win: 'Threats keep working until someone stops them.', lose: 'Nicely defended. Rematch?' }),
  bot('amara', 'Amara', 1100, 'Intermediate', 'Steady and tidy. Punishes loose pieces.', '#bc4b51', { depth: 3, multipv: 6, temp: 45, blunder: .08, book: .8 }, { hi: 'Keep your pieces protected and we will have a real game.', win: 'One loose piece was enough.', lose: 'Clean play. I had no way in.' }),
  bot('tomas', 'Tomás', 1300, 'Intermediate', 'An attacker. He pushes pawns at your king and does not look back.', '#d1495b', { depth: 3, multipv: 6, temp: 35, blunder: .06, book: .85, attack: 25 }, { hi: 'I hope you have castled. It may not help.', win: 'The attack crashed through!', lose: 'I burned my bridges and you crossed them anyway.' }),
  bot('hana', 'Hana', 1500, 'Advanced', 'Patient. She trades down and outlasts you in the endgame.', '#30638e', { depth: 4, multipv: 5, temp: 22, blunder: .035, book: .9, trade: 12 }, { hi: 'There is no hurry. The endgame will still be there.', win: 'Endgames reward patience.', lose: 'You out-calculated me. Thank you for the game.' }),
  bot('felix', 'Felix', 1650, 'Advanced', 'A coffeehouse gambiteer who sacrifices first and checks later.', '#edae49', { depth: 4, multipv: 5, temp: 18, blunder: .025, book: .95, attack: 30, capture: -5 }, { hi: 'A pawn? Take it. I insist.', win: 'Who needs material anyway?', lose: 'The sacrifice was sound in my heart.' }),
  bot('ines', 'Inês', 1800, 'Advanced', 'A positional player who squeezes you slowly.', '#00798c', { depth: 5, multipv: 4, temp: 12, blunder: .012, book: 1 }, { hi: 'I will take the good squares first, if you do not mind.', win: 'Your position ran out of good moves.', lose: 'Precise. I could not find any weakness to press.' }),
  bot('rook', 'Professor Rook', 1950, 'Master', 'Retired teacher, ruthless with a small advantage.', '#3d405b', { depth: 6, multipv: 3, temp: 7, blunder: .004, book: 1, timeMs: 1200 }, { hi: 'Let us see what you have studied.', win: 'A useful lesson. Run the review afterwards.', lose: 'Top marks today.' }),
  bot('vesper', 'Vesper', 2100, 'Master', 'Calm, quick and unusually hard to surprise.', '#6d597a', { depth: 9, multipv: 2, temp: 4, blunder: 0, book: 1, timeMs: 1600 }, { hi: 'Good luck.', win: 'Well fought.', lose: 'Impressive. Very few people manage that.' }),
  bot('tempo', 'Tempo Max', 2300, 'Master', 'The full engine at full strength. It does not get tired.', '#22333b', { depth: 40, multipv: 1, temp: 0, blunder: 0, book: 1, timeMs: 3000 }, { hi: 'Engine ready. Full strength.', win: 'Game complete.', lose: 'Result recorded. Remarkable.' }),
  bot('lumen', 'Lumen', 1200, 'Personalities', 'Only ever wants a wild, open fight. Queens stay on.', '#f4a259', { depth: 3, multipv: 6, temp: 30, blunder: .07, book: .5, attack: 35, capture: 15 }, { hi: 'Open every file. Let us have fun.', win: 'What a mess. I loved it.', lose: 'Wild game. You kept your head.' }),
  bot('moss', 'Moss', 1000, 'Personalities', 'Never hurries. Shuffles, defends and waits for you to overreach.', '#8cb369', { depth: 3, multipv: 6, temp: 40, blunder: .08, book: .5, capture: -15 }, { hi: 'Take your time. I certainly will.', win: 'You came to me.', lose: 'You found the way through my wall.' }),
  bot('echo', 'Echo', 1400, 'Personalities', 'A copycat who loves symmetrical openings and quiet equality.', '#4d9078', { depth: 4, multipv: 5, temp: 25, blunder: .05, book: 1, trade: 18 }, { hi: 'Whatever you play, I may play too.', win: 'You blinked first.', lose: 'You broke the symmetry better than I did.' })
];
var COACHES = [
  { id: 'ada', name: 'Coach Ada', color: '#2a9d8f', style: 'Warm and patient. Explains ideas in plain words for newer players.', prompt: 'You are Coach Ada, a warm, patient chess tutor who explains ideas in plain words, avoids jargon and always encourages.',
    good: ['Nice move.', 'That is exactly the idea.', 'Good thinking.'], ok: ['That works.', 'Reasonable choice.'], bad: ['Let us look at that one together.', 'Not the end of the world, but look here.'] },
  { id: 'viktor', name: 'Coach Viktor', color: '#577590', style: 'Direct and exact. Talks about plans, weak squares and pawn structure.', prompt: 'You are Coach Viktor, a direct and exacting chess tutor who focuses on plans, weak squares, pawn structure and accurate calculation, in short sentences.',
    good: ['Correct.', 'Accurate.', 'Good. That is the principled move.'], ok: ['Playable.', 'Acceptable, not the most exact.'], bad: ['No. Calculate this again.', 'That has a concrete problem.'] },
  { id: 'zuri', name: 'Coach Zuri', color: '#e76f51', style: 'Energetic. Hunts for attacks, sacrifices and king safety.', prompt: 'You are Coach Zuri, an energetic chess tutor who loves attacks, tactics and king safety, and who speaks with enthusiasm but stays accurate.',
    good: ['Yes! Keep the pressure on.', 'Love it.', 'That is attacking chess.'], ok: ['Fine, but there may be more.', 'Solid. Now look for targets.'], bad: ['Careful, the attack just slipped.', 'Ouch. Let us see what that allowed.'] }
];

var COURSES = [
  { id: 'basics', title: 'First Moves', level: 'New to chess', blurb: 'How every piece moves, and how a game ends.', lessons: [
    { title: 'The goal of the game', steps: [
      { f: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', t: 'Chess is played on 64 squares by two armies. You win by trapping the enemy king so it cannot escape. That is called checkmate. White always moves first.' },
      { t: 'Each square has a name: a letter for the file and a number for the rank. The highlighted square is e4, one of the four centre squares.', marks: ['e4'] },
      { t: 'Try your first move. Push the king\'s pawn two squares to e4.', move: 'e2e4', arrows: [['e2', 'e4']], ok: 'That is the most popular first move in chess.' } ] },
    { title: 'Rooks and bishops', steps: [
      { f: '4k3/8/8/3R2p1/8/8/8/4K3 w - - 0 1', t: 'The rook moves any distance in a straight line along ranks and files. It captures what it lands on. Take the pawn on g5.', move: 'd5g5', ok: 'Rooks are worth about 5 pawns.' },
      { f: '4k3/8/5p2/8/3B4/8/8/4K3 w - - 0 1', t: 'The bishop moves any distance diagonally, so it stays on one colour for the whole game. Take the pawn on f6.', move: 'd4f6', ok: 'Bishops are worth about 3 pawns.' } ] },
    { title: 'Queen and king', steps: [
      { f: '6k1/1p6/8/8/4Q3/8/8/4K3 w - - 0 1', t: 'The queen combines the rook and the bishop. She is your strongest piece, worth about 9 pawns. Capture the pawn on b7.', move: 'e4b7', ok: 'She crossed the board in one move.' },
      { f: '8/8/8/8/3pK3/8/8/7k w - - 0 1', t: 'The king moves one square in any direction and may never step onto an attacked square. Take the loose pawn.', move: 'e4d4', ok: 'Kings can capture too, as long as the piece is unprotected.' } ] },
    { title: 'The knight', steps: [
      { f: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', t: 'Knights move in an L shape: two squares one way, then one square sideways. They are the only pieces that jump over others. Jump to f3.', move: 'g1f3', ok: 'From f3 the knight eyes the centre.' },
      { f: '4k3/8/3p4/8/4N3/8/8/4K3 w - - 0 1', t: 'A knight captures only on the square where it lands. Take the pawn on d6.', move: 'e4d6', ok: 'That is also check, because the knight now attacks e8.' } ] },
    { title: 'Pawns and promotion', steps: [
      { f: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1', t: 'Pawns move straight ahead but capture diagonally, one square forward. Capture on d5.', move: 'e4d5', ok: 'Pawns never move backwards.' },
      { f: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', t: 'A pawn reaching the last rank promotes. Almost everyone picks a queen. Push the pawn to a8 and choose a queen.', move: 'a7a8q', ok: 'A humble pawn just became the strongest piece.' } ] },
    { title: 'Check and checkmate', steps: [
      { f: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', t: 'Check means the king is under attack. Give check by moving the rook to a8.', move: 'a1a8', ok: 'The rook attacks along the whole back rank.' },
      { f: 'R3k3/8/8/8/8/8/8/4K3 b - - 0 1', t: 'Now you are Black and in check. You can move the king, block, or capture the attacker. Step up to e7.', move: 'e8e7', ok: 'Safe. Your king left the attacked rank.' },
      { f: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', t: 'Checkmate is a check with no escape. Black\'s own pawns trap this king. Deliver mate.', goal: 'mate', ok: 'Checkmate. The game ends at once.' } ] },
    { title: 'Castling', steps: [
      { f: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', t: 'Castling moves the king two squares toward a rook, and the rook hops over. It tucks the king away and activates the rook. Castle kingside by moving the king to g1.', move: 'e1g1', ok: 'The king is safe in the corner and the rook is on f1.' },
      { f: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', t: 'You can also castle queenside. Move the king to c1.', move: 'e1c1', ok: 'The rook lands on d1, already on a central file.' },
      { f: '4k3/8/8/8/8/5r2/8/4K2R w K - 0 1', t: 'There are limits. The king and rook must not have moved, the squares between must be empty, and the king cannot castle out of, through or into check. Here the black rook covers f1, so White cannot castle.', marks: ['f1'] } ] },
    { title: 'En passant', steps: [
      { f: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', t: 'Black just pushed a pawn from d7 to d5, passing your pawn. Only on the very next move, you may capture it as if it had moved one square. Capture en passant on d6.', move: 'e5d6', ok: 'The black pawn disappears from d5. The right expires if you wait.' } ] },
    { title: 'Draws and stalemate', steps: [
      { f: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', t: 'If the player to move is not in check but has no legal move, the game is a draw by stalemate. Here Black has no move at all, so a winning position has been thrown away.', marks: ['h8'] },
      { f: '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1', t: 'Avoid that trap. Moving to f7 would be stalemate. Find a move that checkmates instead.', goal: 'mate', ok: 'Mate, not stalemate. Always check that your opponent has a legal move left, unless you are mating.' },
      { t: 'Games are also drawn by threefold repetition, by 50 moves without a capture or pawn move, by too little material to mate, and by agreement.' } ] }
  ] },
  { id: 'tactics', title: 'Winning Tactics', level: 'Beginner to club', blurb: 'The short combinations that decide most games.', lessons: [
    { title: 'The fork', steps: [
      { f: '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', t: 'A fork attacks two targets at once, and your opponent can only save one. Find the knight check that also hits the rook.', move: 'd5e7', reply: 'g8f8', ok: 'The king and rook are both attacked.' },
      { t: 'Black had to deal with the check. Collect the rook.', move: 'e7c8', ok: 'You just won a whole rook.' },
      { f: '4k3/8/8/2n1n3/8/8/3P4/4K3 w - - 0 1', t: 'Even a pawn can fork. Push the pawn so that it attacks both knights.', move: 'd2d4', ok: 'One of the knights will fall. Pawn forks are often the most profitable of all.' } ] },
    { title: 'The pin', steps: [
      { f: '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', t: 'A pin attacks a piece that cannot move without exposing something more valuable behind it. Pin the knight to the king.', move: 'f1b5', ok: 'The knight on c6 cannot legally move now.' },
      { f: '4k3/4n3/8/3P4/8/8/4R3/4K3 w - - 0 1', t: 'Pinned pieces are targets. The knight on e7 cannot move, so attack it with the cheapest piece you have.', move: 'd5d6', ok: 'A pawn attacks a frozen knight, and Black cannot save it.' } ] },
    { title: 'The skewer', steps: [
      { f: '8/1q6/2k5/8/8/3B4/8/K7 w - - 0 1', t: 'A skewer is a pin in reverse: the valuable piece stands in front and must move, exposing the one behind. Check the king along the diagonal.', move: 'd3e4', reply: 'c6d6', ok: 'The king has to step aside.' },
      { t: 'The way to the queen is clear.', move: 'e4b7', ok: 'A bishop for a queen would already be great. You won her for free.' } ] },
    { title: 'Discovered attacks', steps: [
      { f: '4k3/8/8/1q6/8/8/4B3/4R1K1 w - - 0 1', t: 'Moving one piece can unveil an attack from the piece behind it. Your rook is aimed at the king, with the bishop in the way. Move the bishop with the biggest effect.', move: 'e2b5', ok: 'The queen is gone and Black is in check from two pieces at once.' } ] },
    { title: 'Removing the defender', steps: [
      { f: '6k1/1p3ppp/2n5/1B6/8/8/5PPP/3R2K1 w - - 0 1', t: 'If one piece holds everything together, remove it. The knight on c6 is the only guard of d8. Capture it.', move: 'b5c6', reply: 'b7c6', ok: 'Black recaptured, but look what that left unguarded.' },
      { t: 'The guard is gone. Finish the game.', goal: 'mate', ok: 'Back-rank mate, made possible by removing the defender.' } ] },
    { title: 'Back-rank weakness', steps: [
      { f: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', t: 'A castled king behind unmoved pawns has no escape square. Exploit it.', goal: 'mate', ok: 'This pattern wins games at every level.' },
      { f: '6k1/5ppp/8/8/8/8/5PPP/3r2K1 w - - 0 1', t: 'Here the same pattern hits you, and you are already in check with no defence. That is why strong players make an escape square in good time by pushing a pawn such as h3 before it matters.', marks: ['g1', 'd1'] } ] }
  ] },
  { id: 'mates', title: 'Checkmate Patterns', level: 'All levels', blurb: 'Recognise mating nets on sight.', lessons: [
    { title: 'The rook ladder', steps: [
      { f: '6k1/8/R7/8/1R6/8/8/6K1 w - - 0 1', t: 'Two rooks mate like climbing a ladder: one holds a rank while the other gives check. The a-rook covers the 6th rank. Take the 7th rank away.', move: 'b4b7', reply: 'g8f8', ok: 'The king is now stuck on the back rank.' },
      { t: 'Finish with the other rook.', goal: 'mate', ok: 'Ladder mate. It works from anywhere on the board.' } ] },
    { title: 'Queen and king', steps: [
      { f: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', t: 'A queen needs help from her king for the final blow. Land next to the enemy king on a square your king protects.', goal: 'mate', ok: 'The black king cannot capture a protected queen.' } ] },
    { title: 'King and rook', steps: [
      { f: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', t: 'With kings facing each other, a rook check on the edge is mate. This is the target position of the basic rook endgame.', goal: 'mate', ok: 'Your king guards every square on the 7th rank that the king could reach.' } ] },
    { title: 'Smothered mate', steps: [
      { f: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', t: 'A king surrounded by its own pieces can be mated by a lone knight. Find the jump.', goal: 'mate', ok: 'The king was smothered by its own rook and pawns.' } ] },
    { title: 'Arabian mate', steps: [
      { f: '7k/7p/5N2/8/8/8/8/6RK w - - 0 1', t: 'One of the oldest patterns: a rook and knight working in the corner. The knight protects g8. Use that.', goal: 'mate', ok: 'The knight guards the rook, and the pawn on h7 blocks the last flight square.' } ] },
    { title: 'Beat the four-move mate', steps: [
      { f: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', t: 'Queen and bishop both aim at f7, the weakest square in Black\'s camp. Black made a natural-looking mistake. Punish it.', goal: 'mate', ok: 'This trap catches many beginners.' },
      { f: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', t: 'Now defend as Black. The threat is Qxf7 mate. Stop it with a good developing or attacking move.', move: ['g7g6', 'd8e7', 'd8f6'], ok: 'Threat parried. Now White\'s early queen can become a target.' } ] }
  ] },
  { id: 'openings', title: 'Opening Principles', level: 'Beginner to club', blurb: 'Good first moves without memorising theory.', lessons: [
    { title: 'Fight for the centre', steps: [
      { f: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', t: 'Pieces in the centre reach more squares. Start by placing a pawn in the middle.', move: ['e2e4', 'd2d4'], marks: ['d4', 'e4', 'd5', 'e5'], ok: 'You claimed space and opened lines for your bishop and queen.' } ] },
    { title: 'Develop your pieces', steps: [
      { f: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', t: 'Bring pieces out with purpose. Which knight move attacks the e5 pawn and develops?', move: 'g1f3', ok: 'Developing with a threat gains time.' },
      { f: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', t: 'Black defended. Now develop the bishop to an active square so you can castle soon.', move: ['f1c4', 'f1b5'], ok: 'Knights and bishops first, heavy pieces later.' } ] },
    { title: 'Castle early', steps: [
      { f: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', t: 'A king in the centre is exposed once lines open. You have cleared the way, so get it to safety.', move: 'e1g1', ok: 'King safe, rook activated. Most good games castle within ten moves.' } ] },
    { title: 'Do not bring the queen out early', steps: [
      { f: 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', t: 'An early queen can be chased, and each chase gives the other side a free developing move. Develop a piece with tempo on the queen.', move: 'b1c3', ok: 'She has to move again while your development keeps growing.' } ] },
    { title: 'A checklist for every move', steps: [
      { f: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7', t: 'Before you move, ask three things. What does my opponent\'s last move threaten? Are any of my pieces undefended? Which of my pieces is doing the least, and how can I improve it?' },
      { t: 'In this quiet position, the bishop on c1 is your worst piece. Improve it with a developing pin on the f6 knight.', move: 'c1g5', ok: 'Your whole army is now in play. That is a good opening.' } ] }
  ] },
  { id: 'strategy', title: 'Thinking Like a Player', level: 'Club', blurb: 'What to do when no tactic exists.', lessons: [
    { title: 'Piece values and trades', steps: [
      { f: '4k3/8/8/3r4/8/2N5/8/4K3 w - - 0 1', t: 'Pawn 1, knight and bishop 3, rook 5, queen 9. Count before every capture. Here is an easy one: is this rook protected? Take it.', move: 'c3d5', ok: 'You won 5 points for free.' },
      { f: '4k3/2p5/3p4/8/8/8/3Q4/4K3 w - - 0 1', t: 'Now compare. Queen takes d6 would lose 9 points for 1, because the c7 pawn recaptures. Check every defender before you capture.', marks: ['d6', 'c7'] } ] },
    { title: 'Rooks belong on open files', steps: [
      { f: '6k1/pp3ppp/8/8/8/8/PP3PPP/R5K1 w - - 0 1', t: 'A file with no pawns on it is open, and rooks need open lines. Place your rook on one.', move: ['a1c1', 'a1d1', 'a1e1'], ok: 'From there it can invade the 7th or 8th rank.' } ] },
    { title: 'Outposts for knights', steps: [
      { f: 'r2q1rk1/pp4pp/2p1bn2/3p4/3P4/2N1PN2/PP3PPP/R2Q1RK1 w - - 0 1', t: 'An outpost is a square that enemy pawns can no longer attack. Knights thrive on them, particularly in the centre. Black has no f-pawn and the d-pawn has already passed, so e5 is an outpost.', marks: ['e5'] },
      { t: 'Move your knight to the outpost.', move: 'f3e5', ok: 'A centralised knight restricts the enemy pieces and supports your attack.' } ] },
    { title: 'Pawn weaknesses', steps: [
      { f: '4k3/pp4pp/8/2p5/2P5/P7/1P4PP/4K3 w - - 0 1', t: 'Pawns cannot move backwards, so each push is permanent. Isolated pawns have no neighbours to protect them. Doubled pawns block each other. Passed pawns have no enemy pawn to stop them.' },
      { f: '4k3/8/8/3P4/8/8/8/4K3 w - - 0 1', t: 'A passed pawn is a long-term asset that ties down enemy pieces. Push it.', move: 'd5d6', ok: 'Passed pawns must be pushed, as the old saying goes.' } ] }
  ] },
  { id: 'endgames', title: 'Essential Endgames', level: 'Club and up', blurb: 'Convert wins and save lost games.', lessons: [
    { title: 'King and pawn: outflank', steps: [
      { f: '3k4/8/4K3/4P3/8/8/8/8 w - - 0 1', t: 'With your king in front of the pawn on the 6th rank, you win. Step aside to escort the pawn, covering the squares it needs.', move: 'e6f7', reply: 'd8d7', ok: 'Your king now controls e8, e7 and e6.' },
      { t: 'Push the pawn with check.', move: 'e5e6', reply: 'd7d8', ok: 'The black king is only a spectator.' },
      { t: 'Keep going.', move: 'e6e7', reply: 'd8d7', ok: 'One more step.' },
      { t: 'Promote to a queen.', move: 'e7e8q', ok: 'Key idea: the king leads and the pawn follows.' } ] },
    { title: 'Lucena: building a bridge', steps: [
      { f: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', t: 'The most important rook endgame. Your king is stuck in front of the pawn. First, push the enemy king away with a rook check.', move: 'c1d1', reply: 'd8e7', ok: 'The king was cut off from the pawn.' },
      { t: 'Now the surprising move: lift the rook to the 4th rank. It will soon become a bridge.', move: 'd1d4', reply: 'a2a1', ok: 'Your king can now come out.' },
      { t: 'Step out and start walking.', move: 'b8c7', reply: 'a1c1', ok: 'Black starts checking from behind.' },
      { t: 'Walk toward the rook.', move: 'c7b6', reply: 'c1b1', ok: 'More checks are coming.' },
      { t: 'Keep approaching.', move: 'b6c6', reply: 'b1c1', ok: 'One more step.' },
      { t: 'Go to b5, next to your bridge.', move: 'c6b5', reply: 'c1b1', ok: 'Now the rook does its job.' },
      { t: 'Block the check.', move: 'd4b4', ok: 'The bridge is built. The checks are over, and the pawn will promote.' } ] },
    { title: 'Philidor: the saving rank', steps: [
      { f: '4k3/R7/7r/4PK2/8/8/8/8 b - - 0 1', t: 'Now you defend as Black. Your rook on the 6th rank stops the white king from coming forward. Stay on that rank until the pawn advances to e6.', marks: ['e6', 'f6', 'g6'] },
      { f: '4k3/R7/4P2r/5K2/8/8/8/8 b - - 0 1', t: 'The pawn has advanced, so the king has lost its shelter. Now send the rook far away to give checks from behind.', move: 'h6h1', ok: 'White has no way to hide from the checks. It is a draw.' } ] },
    { title: 'Practise the mating technique', steps: [
      { f: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', t: 'Queen and king against king is won in under ten moves with practice. Use your queen to box the king in, shrink the box, then bring your king up. Avoid stalemate. You can train this in Drills with the engine defending.' } ] }
  ] }
];

var DRILLS = [
  { id: 'kqk', title: 'Queen mate', group: 'Basic mates', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', goal: 'mate', par: 10, tip: 'Box the king in with knight-distance queen moves, then bring your king.' },
  { id: 'krk', title: 'Rook mate', group: 'Basic mates', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', goal: 'mate', par: 16, tip: 'Cut the king off along a rank or file, then use your king to force it back.' },
  { id: 'krrk', title: 'Two rook ladder', group: 'Basic mates', fen: '8/8/8/4k3/8/8/8/R3K2R w - - 0 1', goal: 'mate', par: 8, tip: 'One rook holds a line while the other gives check.' },
  { id: 'kbbk', title: 'Two bishop mate', group: 'Harder mates', fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', goal: 'mate', par: 20, tip: 'Keep the bishops side by side as a wall and bring the king up.' },
  { id: 'kbnk', title: 'Bishop and knight mate', group: 'Harder mates', fen: '8/8/8/4k3/8/8/8/1N2KB2 w - - 0 1', goal: 'mate', par: 33, tip: 'Mate only works in a corner of your bishop\'s colour. This one is truly hard.' },
  { id: 'kpk', title: 'Promote the pawn', group: 'Pawn endings', fen: '4k3/8/4K3/4P3/8/8/8/8 b - - 0 1', goal: 'mate', par: 15, tip: 'King in front of the pawn. Use the opposition.' },
  { id: 'lucena', title: 'Win the Lucena', group: 'Rook endings', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', goal: 'mate', par: 25, tip: 'Check, lift the rook to the 4th rank, then build the bridge.' },
  { id: 'philidor', title: 'Hold the Philidor', group: 'Rook endings', fen: '4k3/R7/7r/4PK2/8/8/8/8 b - - 0 1', goal: 'draw', par: 25, tip: 'Stay on the 6th rank until the pawn moves, then check from far away.' }
];
