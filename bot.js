const config = require("./config.js");
const Discord = require("discord.js");
const xml2json = require("./xml2json.js");
const client = new Discord.Client(); // Our bot's user.
const MongoClient = require('mongodb').MongoClient;

const googleTranslate = require('google-translate')(config.googleAPIKey);


const Mal = require('./mal.js');
let mal = new Mal({username: config.MAL_ID, password: config.MAL_PASS});
mal.verifyCredentials()
  .then(user => console.log("MAL account: " + user.username + ' verified.'))
  .catch(err => console.error(err));

var tokenActive = false;
var tokenID = null;

// Each command need not use the parameters that are passed in.
MongoClient.connect(config.MONGO_URL, function(err,db){
	
	if(err) throw err;
	var collection = db.collection('JACUserInfo');
	
	// Accepts either nickname or username.
	function getIDFromName(name, guild){
		var id = null;
		guild.members.forEach(function(member){
			if(member.user.username == name || member.user.nickname == name){
				id = member.user.id;
			}
		});
		return id;
	}

	// Creates userinfo entry in database. Returns false if insertion failed.
	function createEntry(id, name, channel = null, strikes = 0){
		collection.find({id: id}).toArray(function(err, choices){
			if(err) throw err;
			if(choices.length == 0){
				var current_time = new Date(); // TODO: implement times
				var data = {name: name, id: id, note: "", mal: "", strikes: strikes, jointime: current_time, lastonline: current_time, tokens: 0};
				collection.insert(data, function(err, docs){
					if(err) throw err;
					console.log(docs);
				});
			//	if(channel != null) channel.sendMessage("👌");
			} else {
			//	if(channel != null) channel.sendMessage("That user already has an entry, baka.");
			}
		});  
	}

	var commands = {
		rules: function(params, message){
			console.log("rules works");
		},
		help: function(params, message){
			message.channel.sendMessage(config.helpText);
		},
		tasukete: function(params, message){
			message.channel.sendMessage(config.helpText);
		},
		mal: function(params, message){
			var title = params.join(" ");
			mal.searchEntry('anime', title)
			  .then(animes => {
			  	var anime = animes[0]? animes[0] : animes;
			    message.channel.sendMessage(anime.title + " ― https://myanimelist.net/anime/" + anime.id);
			  })
			  .catch(err => console.error(err));

		},
		anime: function(params, message){
			var title = params.join(" ");
			mal.searchEntry('anime', title)
			  .then(animes => {
			    var anime = animes[0];
			    message.channel.sendMessage(anime.title + " ― https://myanimelist.net/anime/" + anime.id);
			  })
			  .catch(err => console.error(err));

		},
		manga: function(params, message){
			mal.searchEntry('manga', params.join(' '))
			  .then(entries => {
			    var entry = entries[0];
			    message.channel.sendMessage(entry.title + " ― https://myanimelist.net/manga/" + entry.id);
			  })
			  .catch(err => console.error(err));
		},
		setgame: function(params, message){
			client.user.setGame(params.join(" "));
		},
		createinfo: function(params, message){
			if(params[0] == null){
				message.channel.sendMessage("I need a name, baka.");
				return;
			}
			var name = params.join(" ");
			var id = null;
			if(name[0] == '<' && name[1] == '@'){
				id = name.slice(2, name.length - 1);
			} else {
				id = getIDFromName(name, message.guild);
			}
			if(id == null){
				message.channel.sendMessage("No user with that name was found.");
				return 0;
			}

			createEntry(id, params[0], message.channel);
		
		},
		delinfo: function(params, message){
			if(params[0] == null){
				message.channel.sendMessage("I need a name, baka.");
				return;
			}
			var name = params.join(" ");
			var id = null;
			if(name[0] == '<' && name[1] == '@'){
				id = name.slice(2, name.length - 1);
			} else {
				id = getIDFromName(name, message.guild);
			}
			if(id == null){
				message.channel.sendMessage("No user with that name was found.");
				return 0;
			}

			collection.remove({id: id});
		},
		userinfo: function(params, message){
			if(params[0] == null){
				message.channel.sendMessage("I need a name, baka.");
				return 0;
			}
			var name = params.join(" ");
			var id = null;
			if(name[0] == '<' && name[1] == '@'){
				id = name.slice(2, name.length - 1);
			} else {
				id = getIDFromName(name, message.guild);
			}
			if(id == null){
				message.channel.sendMessage("No user with that name was found.");
				return 0;
			}

			collection.find({id: id}).toArray(function(err, choices){
				if(choices.length == 0){
					message.channel.sendMessage("That user has no entry associated with them.");
				} else if (message.channel.name.startsWith("officer")){ // Display additional info if in an officer channel.
					message.channel.sendMessage(choices[0].name + " | " + choices[0].note + " | Strikes: " + choices[0].strikes + "/3 | " 
						+ "MAL: " + choices[0].mal);
				} else {
					message.channel.sendMessage(

`**` + choices[0].name + `** *` + choices[0].note + `*
*Last Online*: ` + choices[0].lastonline + `
` + choices[0].mal + `
` + choices[0].name + ` has ` + choices[0].tokens + ` tokens.`

					);
				}
			});

		},
		setnote: function(params, message){
			var id = null;
			var note = params;

			if(params[0][0] == '"'){
				id = message.member.user.id;
			} else {
				if(params[1][0] != '"' || params[params.length-1][params[params.length-1].length -1] != '"'){
					message.channel.sendMessage("Please enclose your note in quotations (\" \").");
					return;
				}
				var name = params[0];
				if(name[0] == '<' && name[1] == '@'){
					id = name.slice(2, name.length - 1);
				} else {
					id = getIDFromName(name, message.guild);
				}
				console.log(name);
				if(id == null){
					message.channel.sendMessage("No user with that name was found.");
					return 0;
				}
				note.shift();
			}

			note = note.join(" ");
			if(note[0] == '"' && note[note.length-1] == '"'){
				collection.update({id:id}, {$set: {note: note}})
				message.channel.sendMessage("👌");
			}
		},
		setmal: function(params, message){
			var id = message.member.user.id;
			collection.update({id:id}, {$set: {mal: "https://myanimelist.net/animelist/" + params[0]}});
			message.channel.sendMessage("👌");
		},
		grab: function(params, message){
			if(tokenActive){
				tokenActive = false;
				collection.find({id: message.member.user.id}).toArray(function(err, choices){
					message.channel.sendMessage(message.member.user.username + " grabbed the token! They currently have " + (parseInt(choices[0].tokens) + 1) + " tokens.");
				});
				if(tokenID) tokenID.delete();
				tokenID = null;

				collection.update({ id : message.member.user.id}, {"$inc" : {"tokens" : 1}},  function(err, doc){
					if(err) console.log("Error occured updating tokens.");
				});

			} else {
				message.channel.sendMessage("No token, baka.");
			}
		},
		nsfw: function(params, message){
			message.member.addRole('297469516089262101');
			client.channels.get("297525001878503424").sendMessage(message.member.user + " ( ͡° ͜ʖ ͡°)");
		},
		// Restricted commands: 
		dropallinfo: function(params, message){
			if(message.member.user.id == "108080037328064512"){
				collection.drop();
				message.channel.sendMessage("u sure fam? aight... 👌");
			} else {
				messsage.channel.sendMessage("I don't answer to you, baka.");
			}
		},
		strike: function(params, message){
			var id = getIDFromName(params[0], message.guild);
			if(id == null){
				message.channel.sendMessage("No user with that name was found.");
				return;
			}
			// If the user is not found, create an entry for them.
			createEntry(id, params[0], null, 1);

			collection.update({id: id}, {"$inc" : {"strikes" : 1}},  function(err, doc){
				if(err) console.log("Error occured updating strike.");
			});
		},
		idontspeakweeb: function(params, message) {
			// May want to switch out message.content with params.
			var nihongo = message.content.substring(message.content.indexOf(" ") + 1);
			googleTranslate.detectLanguage(nihongo, function(err, detection) {
			  	if (detection.language != 'ja') {
			  		message.channel.sendMessage("Dat ain't weeb son.");
			  	} else {
					googleTranslate.translate(nihongo, 'en', function(err, translation) {
				  		message.reply("your message translates to: \"" + translation.translatedText + "\"");
					});
			  	}
			});
		}
	}

	client.on('ready', function(){
		console.log("Bartender online.");
		client.user.setGame("VA-11 HALL-A");
		//client.channels.get("296513441416478720").sendMessage("Nice profile pic, <@151554061081116672>.");
	});
	client.login(config.BOT_TOKEN);

	client.on('presenceUpdate', function(oldMember, newMember){
		var status = newMember.user.presence.status;

		// If the user is new, create new userinfo entry and greet them.
		if(status == "online"){
			collection.find({id: newMember.user.id}).toArray(function(err, choices){
				if(choices.length == 0){
					createEntry(newMember.user.id, newMember.user.username);
					client.channels.get("296513441416478720").sendMessage("Welcome to JAC, " + newMember.user + "!");
				} 
			});
		}
		if(status == "online" || status == "offline"){ // Update the user's data.
			collection.find({id: newMember.user.id}).toArray(function(err, choices){
				if(choices && choices.length != 0){
					collection.update({id: newMember.user.id}, {$set: {lastonline: new Date()}});
					if(choices[0].name != newMember.user.username){
						collection.update({id: newMember.user.id}, {$set: {name: newMember.user.username}});
					}
				} 
			});
		}

	})

	client.on('message', function(msg){

		if(!msg.guild){
			return;
		}

		// I literally learned regex to do this
		if(msg.content.toLowerCase().match("^[a][y][y.+]")){
			msg.channel.sendMessage(Math.random() > 0.8? "lmoa" : (Math.random() > 0.5? "lmao" : "elmoa"));
		}
		if(msg.content.toLowerCase().match("^o\/") && msg.member.user.id != this.user.id /* it'll recurse otherwise */){
			msg.channel.sendMessage("o/");
		}
		if(msg.content.toLowerCase().match("^[y][a][a.+]")){
			msg.channel.sendMessage("gomen gomen");
		}
		// Token generation
		if(Math.random() > 0.97 && !tokenActive && //msg.member.user.username != "Anime Bartender"
		 msg.content.toLowerCase() != "!grab"){
			msg.channel.sendMessage("📀")
				.then(token => tokenID = token);
			tokenActive = true;

			setTimeout(function(){
				tokenActive = false;
				if(tokenID) tokenID.delete();
				tokenID = null;
			}, 5000);

		}

		if(msg.content == "Who made you, Anime Bartender?"){
			msg.channel.sendMessage("Abdullah.");
		}

		if(msg.content[0] == "!"){
			var params  = msg.content.split(" ");
			var command = params.shift().substr(1);
			
			if(commands[command] != null){
				commands[command](params, msg); 
			}
		}
	});


});