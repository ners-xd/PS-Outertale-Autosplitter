# Outertale (Project Spacetime) Autosplitter Mod using WebSockets

# Installation Guide
1. Download the files from Code -> Download ZIP;
2. Drop the LiveSplit folder into your game's mods directory (located in the save folder -> mods);
3. IF YOU ARE ON LIVESPLIT VERSION 1.8.29 OR BELOW (can check by right clicking -> About), download this component: https://github.com/Xenira/LiveSplit-Websocket/releases then add it to your layout. Double click it and change the port from 16835 to 16834. This is not necessary for versions above 1.8.29 as WebSockets became integrated in the program;
4. Every time you open LiveSplit and want to use the autosplitter, you have to right click -> Control -> Start WebServer / Start WS / some other similar wording.
* If you want to use the load remover you have to set LiveSplit to Game Time (right click -> Compare Against -> Game Time).

You can change your preferences in the mod's config.json file.

# Issues
If you notice that it doesn't work, try running LiveSplit as admin.
If that doesn't work either, update your LiveSplit to the latest version (open it and it should prompt you to update if necessary) OR set up the component again if you are on version 1.8.29 or below and don't want to / can't update.

# "splits.json" Information
- name: the split's name, it's also what will be put in config.json to specify if it is enabled for the user or not;
- type: room_change / battle_exit / text_close - the type of split, pretty self explanatory;
- trigger_once: if this split should only be triggered once or as many times as the requirements are met (PER GAME SESSION, NOT PER RUN);
- room_or_text_id: the id of the room or text (in the case of text_close splits) to be checked;
- room_destination: only used for room_change splits, self explanatory.
