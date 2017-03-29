const config = require("./config.js");
const Discord = require("discord.js");
const xml2json = require("./xml2json.js");
const client = new Discord.Client(); // Our bot's user.

const Mal = require('./mal.js');
let mal = new Mal({username: config.MAL_ID, password: config.MAL_PASS});
mal.verifyCredentials()
  .then(user => console.log("MAL account: " + user.username + ' verified.'))
  .catch(err => console.error(err));

// Each command need not use the parameters that are passed in.
var commands = {
	rules: function(params, channel){
		console.log("rules works");
	},
	help: function(params, channel){
		channel.sendMessage(config.helpText);
	},
	mal: function(params, channel){
		mal.searchEntry('anime', params.join(' '))
		  .then(animes => {
		    var anime = animes[0];
		    channel.sendMessage(anime.title + " ― https://myanimelist.net/anime/" + anime.id);
		  })
		  .catch(err => console.error(err));

	},
	anime: function(params, channel){
		mal.searchEntry('anime', params.join(' '))
		  .then(animes => {
		    var anime = animes[0];
		    channel.sendMessage(anime.title + " ― https://myanimelist.net/anime/" + anime.id);
		  })
		  .catch(err => console.error(err));

	},
	manga: function(params, channel){
		mal.searchEntry('manga', params.join(' '))
		  .then(entries => {
		    var entry = entries[0];
		    channel.sendMessage(entry.title + " ― https://myanimelist.net/manga/" + entry.id);
		  })
		  .catch(err => console.error(err));
	}
}

client.on('ready', function(){
	console.log("Bartender online.");
	client.user.setStatus("with herself.", "with herself.");
});
client.login(config.BOT_TOKEN);

client.on('message', function(msg){
	// I literally learned regex to do this
	if(msg.content.toLowerCase().match("^[a][y][y.+]")){
		msg.channel.sendMessage(Math.random() > 0.8? "lmoa" : "lmao");
	}

	if(msg.content[0] == "!"){
		var params  = msg.content.split(" ");
		var command = params.shift().substr(1);
		
		if(commands[command] != null){
			commands[command](params, msg.channel); 
		}
	}
});
