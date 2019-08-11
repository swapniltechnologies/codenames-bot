const {Collection} = require("discord.js");
const Util = require("../Util/Util.js");
const Word = require("./Word.js");
const Team = require("./Team.js");
const Words = require("../Util/Words.js");
const Canvas = require("../Util/Canvas.js");


class Game {
    constructor(channel, id) {
    this.channel = channel;
    this.board = new Canvas();
    this.id = id;
    this.masterBoard = new Canvas();
    this.words = new Words.Words(false);
    this.players = new Collection();
    this.lastAction = null;
    this.started = false;
    this.teams = {
        red: new Team("red", {game: this}),
        blue: new Team("blue", {game: this})
    }
    this.turn = null;
    }

    addWord(word, data) {
       this.words.push(new Word(word, data));
    }

    addPlayer(user, team) {
         this.players.set(user.id, user);
         user.team = this.teams[team];
         this.teams[team].players.set(user.id, user);
    }

    removePlayer(id) {
        const p = this.players.get(id);
        this.players.delete(id);
        p.team.players.delete(id);
    }

    addTeam(name, data) {
        this.teams[name] = new Team(name, data);
    }

    configure(customWords) {
        this.board.drawBoard();
        this.masterBoard.drawBoard();
       const words = Words.Wordlist.random(25, true);
       if (customWords.length) words.replace(customWords.length, customWords);
       let redNum = Util.rngBtw(8, 9);
       const red = words.fromWhich(redNum, "red");
       const blue = words.fromWhich((redNum == 9) ? 8:9, "blue");
       const ass = words.fromWhich(1, "assassin");
       const neut = words.fromWhich(7, "neutral");
       this.teams.red.setWords(red);
       this.teams.blue.setWords(blue);
       this.words.push(...[...ass, ...neut, ...red, ...blue]);
       this.words.shuffle();
       const toarr = this.words.map(w => w.word);
       this.board.placeWords(toarr);
       this.masterBoard.placeWords(toarr);
       this.turn = (red.length == 9) ? this.teams.red:this.teams.blue;
    }

    start() {
        if (!this.turn) return;
        this.started = true;
        this.channel.send(`**${this.turn.emoji} | \`${this.turn}\` (${this.turn.players.map(p => p.username)}), it's your turn!**`);
        this.displayBoard();
        this.displayMasterBoard();
        let counter = 1;
        this.lastAction = Date.now();
        const turns = [this.turn];
        (this.turn.name == 'red') ? turns.push(this.teams.blue):turns.push(this.teams.red);
        this.timer = setInterval(() => {
            const winner = this.isThereAWinner();
            if (winner) {
                this.masterBoard.sendAsMessage(this.channel, `**${winner.emoji} | \`${winner.name}\` (${winner.players.map(p => p.username)}) wins!**`);
                this.stop();
            }else if (this.turn.guesses === 0) {
                   this.turn.canEnd = false;
                   this.turn.guesses = false;
                   this.turn = turns[counter];
                   this.channel.send(`**${this.turn.emoji} | \`${this.turn}\` (${this.turn.players.map(p => p.username)}), it's your turn!**`);
                   this.displayBoard();
                   this.displayMasterBoard();
                   if (counter == turns.length - 1) counter = 0;
                   else counter++;
               }
            else if ((Date.now() - this.lastAction) >= 1200000) {
                this.stop();
                this.channel.send("** 📤 | Game disbanded. **")
            };
        }, 1000);
    }

    stop() {
        this.started = false;
         for (let [, player] of this.players) {
             player.team = null;
         }
        clearInterval(this.timer);
        this.channel.game = null;
    }

    isThereAWinner() {
        if (this.teams.red.wordsLeft == 0) return this.teams.red;
        if (this.teams.blue.wordsLeft == 0) return this.teams.blue;
        if (this.words.assassin() && this.words.assassin().guessedBy.name == 'red') return this.teams.blue;
        if (this.words.assassin() && this.words.assassin().guessedBy.name == 'blue') return this.teams.red;
    }


    displayBoard() {
       this.board.sendAsMessage(this.channel, `🔴 ${this.teams.red.wordsLeft} | 🔵 ${this.teams.blue.wordsLeft}`);
    }

    displayMasterBoard() {
         for (let word of this.words) {
             word.update(this.masterBoard, true);
         }
         this.masterBoard.sendAsMessage(this.turn.spymaster, `**${this.turn.emoji} | Your team: ${this.turn}**`)
    }



}

module.exports = Game;