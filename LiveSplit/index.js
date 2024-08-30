/*
    * Outertale Project Spacetime mod for sending information to LiveSplit using a WebSocket
    * By NERS
*/

export default function(mod, { atlas, content, CosmosText, events, filters, game, logician, music, renderer, SAVE, sounds, text, typer, world, battler})
{
    const socket = new WebSocket("ws://localhost:16834/livesplit");
    var prefs = {};
    var splits = 
    {
        "room_change": [],
        "battle_exit": [],
        "text_close": []
    };

    var 
        timeout = 0,
        neutralTriggered = false,
        neutralTriggered2 = false,
        pacifistTriggered = false,
        bullyTriggered = false,
        battleLoading = false;

    const statusText = new CosmosText(
    {
        filters: [filters.outline],
        fontFamily: content.fDeterminationMono,
        fontSize: 8,
        position: { x: 5, y: 5 }
    })

    socket.onopen = function()
    {
        console.log("[LiveSplit] Mod loaded");
        statusText.fill = 0x00FF00;
        statusText.content = "Connected to LiveSplit!";
        hideStatusText(3000);
    }

    socket.onclose = function(evt)
    {
        console.log("[LiveSplit] Connection error " + evt.code + ": " + evt.type);
        statusText.fill = 0xFF0000;
        if(evt.code == 1005)
        {
            statusText.content = "LiveSplit connection closed!\nRestart the game to reconnect.";
            hideStatusText(5000);
        }
        else if(evt.code == 1006)
        {
            statusText.content = "Could not connect to LiveSplit!\nCheck if you have started the Web Server.\nRestart the game to reconnect.";
            hideStatusText(10000);
        }
    }

    socket.onerror = function(evt)
    {
        if(socket.readyState == 1)
            console.log("[LiveSplit] Error " + evt.code + ": " + evt.type);
    }

    fetch(mod + "/config.json")
        .then((res) => 
        {
            if(!res.ok)
                return console.log("[LiveSplit] Could not load config.json: " + res.status);
            
            return res.json();
        })
        .then((data) => 
        {
            prefs = data;
        })
        .catch((error) => console.log("[LiveSplit] Unable to fetch config.json data: " + error));

    fetch(mod + "/splits.json")
        .then((res) => 
        {
            if(!res.ok)
                return console.log("[LiveSplit] Could not load splits.json: " + res.status);
            
            return res.json();
        })
        .then((data) => 
        {
            data.splits.forEach(element => 
            {
                element.activators.forEach(activator => 
                {
                    activator.name = element.name;
                    activator.enabled = prefs[element.name];
                    splits[activator.type].push(activator);
                });
            });
        })
        .catch((error) => console.log("[LiveSplit] Unable to fetch splits.json data: " + error));

    function hideStatusText(time)
    {
        clearTimeout(timeout);
        timeout = setTimeout(() => 
        {
            if(game.active || atlas.target)
                statusText.content = "";
            else
                hideStatusText(time);
        }, time);
    }

    function textMatch(text1, text2)
    {
        text1 = text1.toString()
            .replace(/(\r\n|\n|\r)/gm, " ") // Remove line breaks
            .replace(/<([^]*)>/gm, "")      // Remove word wrap
            .replace(/{([^{}]*)}/gm, "")    // Remove inline code
            .replace(/§([^§]*)§/gm, "");    // Remove inline fill
        
        text2 = text2.split(".");
        switch(text2.length)
        {
            case 1:
                text2 = text[text2[0]];
                break;
            case 2:
                text2 = text[text2[0]][text2[1]];
                break;
            case 3:
                text2 = text[text2[0]][text2[1]][text2[2]];
                break;
            case 4:
                text2 = text[text2[0]][text2[1]][text2[2]][text2[3]];
                break;
            case 5: // Should be enough, the largest array I found in the game's text has a length of 5
                text2 = text[text2[0]][text2[1]][text2[2]][text2[3]][text2[4]];
                break;
        }

        text2 = text2.toString()
            .replace(/(\r\n|\n|\r)/gm, " ")
            .replace(/<([^]*)>/gm, "")    
            .replace(/{([^{}]*)}/gm, "")
            .replace(/§([^§]*)§/gm, "");

        return (text1 == text2);
    }

    // Completely deactivates errors so they don't show up / trigger debug mode (thanks spacey)
    logician.suspend = () => {};

    // Runs every frame (not including pre-intro or the game over screen, those segments don't have this renderer active)
    renderer.on("tick", () =>
    {
        renderer.attach("menu", statusText);
        if(socket.readyState == 1)
        {
            if((prefs["AutoStart"] || prefs["AutoReset"]) && atlas.target == "frontEndNameConfirm" && atlas.navigators.of("frontEndNameConfirm").objects[2].alpha.value < 0.01 && game.input == false)
            {
                if(prefs["AutoReset"])
                    socket.send("reset");
                
                if(prefs["AutoStart"] || (!prefs["AutoStart"] && prefs["AutoReset"]))
                    socket.send("starttimer");
            }

            // Had to hard code these ones, I genuinely don't know how to do it otherwise
            if(prefs["AutoSplit"])
            {
                if(game.room == "c_exit")
                {
                    if(prefs["Neutral Ending"] && !world.postnoot && !neutralTriggered && SAVE.flag.n.neutral_twinkly_stage == 6)
                    {
                        socket.send("split");
                        neutralTriggered = true;
                    }

                    else if(prefs["NG+ Neutral Ending"] && world.postnoot && !neutralTriggered2 && sounds.noise.instances.length == 1)
                    {
                        socket.send("split");
                        neutralTriggered2 = true;
                    }
                }
                
                else if(prefs["Pacifist Ending"] && !pacifistTriggered && game.room == "_hangar" && music.credits1.instances.length == 1)
                {
                    socket.send("split");
                    pacifistTriggered = true;
                }

                else if(prefs["Bully Ending"] && !bullyTriggered && SAVE.flag.b.bully_sleep == true)
                {
                    socket.send("split");
                    bullyTriggered = true;
                }
            }
            if (prefs["LoadRemoval"] && !battleLoading && !battler.active && battler.SOUL.position.x == battler.buttons[0].position.add(8, 11).x && game.movement == false) {
                battleLoading = true;
                socket.send("pausegametime")
            }
        }
    })

    // Runs on room change
    events.on("teleport-pre", (room, dest) =>
    {
        if(socket.readyState == 1 && prefs["AutoSplit"])
        {
            splits["room_change"].forEach(split =>
            {
                if(split.enabled && 
                  (!split.trigger_once || (split.trigger_once && split.triggered != true)) &&
                  (split.room_or_text_id == null || (split.room_or_text_id != null && split.room_or_text_id == room)) &&
                  (split.room_destination == null || (split.room_destination != null && split.room_destination == dest)))
                {
                    socket.send("split");
                    split.triggered = true;
                }
            })
        }
        if (socket.readyState == 1 && prefs["LoadRemoval"])
            socket.send("pausegametime");
    })

    events.on("teleport", (origin, dest) => {
       if (socket.readyState == 1 && prefs["LoadRemoval"]) {
           socket.send("unpausegametime");
       }
    });

    events.on("battle", () => {
        if (battleLoading)
        {
            if (socket.readyState == 1)
                socket.send("unpausegametime");
            battleLoading = false;
        }
    })

    // Runs on exiting battle
    events.on("battle-exit", () =>
    {
        if(socket.readyState == 1 && prefs["AutoSplit"])
        {
            splits["battle_exit"].forEach(split =>
            {
                if(split.enabled && 
                  (!split.trigger_once || (split.trigger_once && split.triggered != true)) &&
                  (split.room_or_text_id == null || (split.room_or_text_id != null && split.room_or_text_id == game.room)))
                {
                    socket.send("split");
                    split.triggered = true;
                }
            })
        }
    })

    // Runs on textbox progression
    const _typer_reset = typer.reset;
    typer.reset = function(full = false)
    {
        if(socket.readyState == 1 && prefs["AutoSplit"])
        {
            splits["text_close"].forEach(split =>
            {
                if(split.enabled && 
                  (!split.trigger_once || (split.trigger_once && split.triggered != true)) &&
                  (split.room_or_text_id == null || (split.room_or_text_id != null && textMatch(game.text, split.room_or_text_id))))
                {
                    socket.send("split");
                    split.triggered = true;
                }
            })
        }
        _typer_reset.apply(this, [full]);
    }
}