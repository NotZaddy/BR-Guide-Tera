String.prototype.clr = function (hexColor) { return `<font color='#${hexColor}'>${this}</font>` };

module.exports = function VSGuide(mod) {	
	const config = require('./config.json');
    const mapIDs = [9754, 9054]; 
    //const {BossActions, BossMessages, InversedAction} = require('./skills');
    
    // BossAction[TempalateId][Skill.id]
    const BossActions = {
        // Mephisis
        1000: {
            106: {msg: 'SPIT'},
            105: {msg: 'RING'},
            103: {msg: 'HEADBUTT'},
            201: {msg: 'SLAM'},
            303: {msg: 'DRILL'},
            104: {msg: 'SPINNING'},
            1106: {msg: 'SPIT'},
            1105: {msg: 'RING'},
            1103: {msg: 'HEADBUTT'},
            1201: {msg: 'SLAM'},
            1303: {msg: 'DRILL'},
            1104: {msg: 'SPINNING'},

                
        },     
        // Tantibus
        1001: {
            102: {msg: 'BACKFLIP'},
            110: {msg: 'CYCLONE'},
            108: {msg: 'PUDDLE'},
            109: {msg: 'PUDDLE'},
            1102: {msg: 'BACKFLIP'},
            1110: {msg: 'CYCLONE'},
            1108: {msg: 'PUDDLE'},
            1109: {msg: 'PUDDLE'},

           



        },                   
        // Fulminar
        1002: {
            118: {msg: 'BALLS'},
            102: {msg: 'FRONT STIKE'},
            107: {msg: 'BACK CUT'},
            112: {msg: 'JUMP'},
            119: {msg: 'FLOOD'},
            108: {msg: 'BACK PUSH'},
            105: {msg: 'CAGE'},
            110: {msg: 'BLADE SPIN'},
            113: {msg: 'SHIELD'},
            106: {msg: 'RUN TO SAFETY'},
            503: {msg: 'SHIELD'},
            1118: {msg: 'BALLS'},
            1102: {msg: 'FRONT STIKE'},
            1107: {msg: 'BACK CUT'},
            1112: {msg: 'JUMP'},
            1119: {msg: 'FLOOD'},
            1108: {msg: 'BACK PUSH'},
            1105: {msg: 'CAGE'},
            1110: {msg: 'BLADE SPIN'},
            1113: {msg: 'SHIELD'},
            1106: {msg: 'RUN TO SAFETY'},
            1503: {msg: 'SHIELD'},

           
        },
    }

    //MessageId: BossAction
    const BossMessages = {
        // NM
        9781043: 14004,   
        9781044: 31003,   	
        9781045: 13001,  
        // HM
        9981043: 14004,  
        9981044: 31003,   	
        9981045: 13001,   
    }
    
    // stuff  
    const InversedAction = {
        1404: 1405,
        3103: 3104,
        1301: 1302,
        1405: 1404,
        3104: 3103,
        1302: 1301
    }   
    
    
    const NextMessageDelay = 4000;
    const ShieldWarningTime = 80000; //ms
    const ShieldWarningMessage = 'Ring soon';
    const LaserSafespots = [18, 54, 90, 126, 162, 198, 234, 270, 306, 342];
    const LaserNormalDangerOne = [0, 72, 144, 216, 288];
    const LaserInvertedDangerOne = [36, 108, 180, 252, 324];
    
    const Collection_Ids = [445, 548];
   
	let hooks = [],
        enabled = true,
        showItems = true,
        sendNotices = true,
        showOnlyMech = false,

        insidemap = false,
        bossInfo = undefined,        
        timers = {},
        bossLoc = undefined,
        flowerId = 999999999,
        playerDebuffs = [],
        bossHpWarningsNotified = [],
        // 
        shieldWarned = false,
		timerNextMechanic = undefined, 
		lastNextAction = undefined,
		lastInversionTime = undefined,
		isReversed = false, // below 50% hp
		inWorld = false    
            
    mod.command.add('br', (arg, arg2) => {
        if (arg) arg = arg.toLowerCase();
        if (arg2) arg2 = arg2.toLowerCase();
        
        if (arg === undefined) {
            enabled = !enabled;
            mod.command.message(enabled ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00'));
        }
        else if(arg === "off")
        {
            enabled = false;
            mod.command.message(enabled ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00'));
        }
        else if(arg === "on")
        {
            enabled = true;
            mod.command.message(enabled ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00'));
        }
        else if(["item", "items", "flowers"].includes(arg))
        {
            if (arg2 === "off") {
                showItems = false;
            } else if (arg2 === "on") {
                showItems = true;
            } else {
                showItems = !showItems;
            }
            mod.command.message('Show Items: ' + (showItems ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00')));
        }
        else if(["notice", "notices"].includes(arg))
        {
            if (arg2 === "off") {
                sendNotices = false;
            } else if (arg2 === "on") {
                sendNotices = true;
            } else {
                sendNotices = !sendNotices;
            }
            mod.command.message('Use Notices: ' + (sendNotices ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00')));
        }
        else if(["meck"].includes(arg))
        {
            if (arg2 === "off") {
                showOnlyMech = false;
            } else if (arg2 === "on") {
                showOnlyMech = true;
            } else {
                showOnlyMech = !showOnlyMech;
            }
            mod.command.message('Show Only  Mech: ' + (showOnlyMech ? 'Enabled'.clr('56B4E9') : 'Disabled'.clr('E69F00')));
        }        
    });
    
    mod.game.me.on('change_zone', (zone, quick) => { 
        if (mapIDs.includes(zone)) {
            if (!insidemap) {
                mod.command.message('Zaddy\'s Guide for BR '.clr('56B4E9') + (mapIDs[0] === zone ? '[NM]'.clr('E69F00') : mapIDs[1] === zone ? '[HM]'.clr('00FFFF') : ''));
            }
            insidemap = true;
            load();
            configInit();
        } else {
            insidemap = false;
            unload();
        }
    })
    
	function sendMessage(msg) {
        if (!enabled) return;
        
		if(!sendNotices) {
			mod.command.message(msg);
		} else {
			mod.send('S_CHAT', 1, {
                channel: 21, //21 = p-notice, 1 = party
                authorName: 'DG-Guide',
                message: msg
			});
		}
	}
    
    function bossHealth() {
        return Number(bossInfo.curHp) / Number(bossInfo.maxHp);
    }
	
	function startTimer(message, delay, id = 'default') {
        if (timers[id]) clearTimeout(timers[id]);
        timers[id] = setTimeout(() => {
			sendMessage(message);
			timers[id] = null;
		}, delay);	
	}

	function SpawnFlower(position, despawnDelay, collectionId){
        if (!showItems) return;
        
		mod.send('S_SPAWN_COLLECTION', 4, {
			gameId: flowerId,
			id: collectionId,
			amount: 1,
            loc: {x: position.x, y: position.y, z: bossLoc.z},
			w: 0,
			extractor: false,
            extractorDisabled: false,
            extractorDisabledTime: 0
		});
		setTimeout(DespawnFlower, despawnDelay, flowerId)
		flowerId--;
	}
	
	function DespawnFlower(id){
        mod.send('S_DESPAWN_COLLECTION', 2, {
            gameId: id,
            collected: false
        });
	}
    
	function SpawnLoc(degrees, radius) {
        let rads = (degrees * Math.PI/180);
        let finalrad = bossLoc.w - rads;
        
        let spawnx = bossLoc.x + radius * Math.cos(finalrad);
        let spawny = bossLoc.y + radius * Math.sin(finalrad);
        return {x:spawnx,y:spawny};
	}
        
    // safespots
    function BegoneRange() {
        for (let degree = 0; degree < 360; degree += 360 / 20) {
            SpawnFlower(SpawnLoc(degree,250), 6000, Collection_Ids[0]);
        }
    }
        
    function LaserStarNormal() {
        for (let i = 0; i < LaserSafespots.length; i++) {
            SpawnFlower(SpawnLoc(LaserSafespots[i], 450), 5000,  Collection_Ids[1])
        }
        for (let i = 0; i < LaserNormalDangerOne.length; i++) {
            for (let radius = 100; radius < 1000; radius += 50) {
                SpawnFlower(SpawnLoc(LaserNormalDangerOne[i], radius), 2500, Collection_Ids[0]);
            }
        }
    }
    function LaserStarInverted() {
        for (let i = 0; i < LaserSafespots.length; i++) {
            SpawnFlower(SpawnLoc(LaserSafespots[i], 450), 5000,  Collection_Ids[1])
        }
        for (let i = 0; i < LaserInvertedDangerOne.length; i++) {
            for (let radius = 100; radius < 1000; radius += 50) {
                SpawnFlower(SpawnLoc(LaserInvertedDangerOne[i], radius), 2500, Collection_Ids[0]);
            }
        }
    }
    
    
    // Hooks
    function load() {
        if(!hooks.length) {

            hook('S_BOSS_GAGE_INFO', 3, event => {
                bossInfo = event;
                
                let bossHp = bossHealth();      
                                
                // Reset 
                if (bossInfo.templateId === 3000) {
                    if (bossHp <= 0 || bossHp >= 1) {
                        lastNextAction = undefined;
                        isReversed = false;
                        inWorld = false;
                        shieldWarned = false;
                        lastInversionTime = undefined;
                    } else {
                        if (!lastInversionTime) lastInversionTime = Date.now();
                    }
                    
                    if (Date.now() > (lastInversionTime + ShieldWarningTime) && !shieldWarned) {
                        let hint = (!inWorld ? BossActions[3000][1401].msg : BossActions[3000][1402].msg);
                        sendMessage(ShieldWarningMessage + ' -> ' + hint);
                        shieldWarned = true;
                    }
                }
                
                // Reset all bosses
                if (bossHp <= 0) {
                    bossInfo = undefined;
                    //if (timer) clearTimeout(timer);
                    for (let timer in timers) {
                        if (timer) clearTimeout(timer);
                    }
                    timers = {};
                    playerDebuffs = [];
                    flowerId = 999999999;
                    bossHpWarningsNotified = [];
                }
            });
            
            hook('S_ACTION_STAGE', 8, (event) => {         
                if (!bossInfo) return;
                if (event.stage != 0) return;
                if (showOnlyMech && ![1404, 3103, 1301, 1405, 3104, 1302].includes(event.skill.id)) return;
                
//                if ([1000, 2000, 3000].includes(event.templateId)) mod.command.message('skill:   ' + event.skill.id);

                if (!BossActions[event.templateId]) return;
                
                let bossAction = BossActions[event.templateId][event.skill.id];
                if (!bossAction) bossAction = BossActions[event.templateId][event.skill.id - 1000]; // check if skill is enraged
                
                if (bossAction) 
                {
					//if (!BossActions[event.templateId].enabled) return;
					
                    bossLoc = event.loc;
                    bossLoc.w = event.w;
                    
                    if (bossAction.func) bossAction.func();
                    if (bossAction.msg) sendMessage(bossAction.msg);
                    
                    // stuff
                    if (bossInfo.templateId === 3000) {
                        let nextMessage;
                        if (event.skill.id == 1401 || event.skill.id == 2401) {                              // normal to inverse aka world
                            inWorld = true;
                            if (lastNextAction) {
                                nextMessage = BossActions[3000][InversedAction[lastNextAction]].msg;
                                startTimer('Next: ' + nextMessage, NextMessageDelay, 'Meck');
                            }
                            lastInversionTime = Date.now();
                            shieldWarned = false;
                        } else if (event.skill.id == 1402 || event.skill.id == 2402) {                       // inverse to normal
                            inWorld = false;
                            if (lastNextAction) {
                                nextMessage = BossActions[3000][InversedAction[lastNextAction]].msg;
                                startTimer('Next: ' + nextMessage, NextMessageDelay, 'Meck');
                            }
                            lastInversionTime = Date.now();
                            shieldWarned = false;
                        } else if (!isReversed && bossAction.next) {                                         // normal "next"
                            nextMessage = BossActions[3000][bossAction.next].msg;
                            startTimer('Next: ' + nextMessage, NextMessageDelay, 'Meck');
                            lastNextAction = bossAction.next;
                        } else if (isReversed && bossAction.prev) {                                          // reversed "next"
                            nextMessage = BossActions[3000][bossAction.prev].msg;
                            startTimer('Next: ' + nextMessage, NextMessageDelay, 'Meck');
                            lastNextAction = bossAction.prev;
                        }
                    }
                    
                }
            });


            hook('S_DUNGEON_EVENT_MESSAGE', 2, (event) => {	
                if (!bossInfo) return;
                
                let msgId = parseInt(event.message.replace('@dungeon:', ''));
/*
                if (bossInfo.templateId === 3000) {
                    mod.command.message('msgID: ' + msgId);
                }
*/                
                if (BossMessages[msgId]) {
                    for (let timer in timers) {
                        if (timer) clearTimeout(timer);
                    }
                    
                    if (bossInfo.templateId === 3000) {
                        lastNextAction = undefined;
                        isReversed = (bossHealth() < 0.5) ? true : false;
                        if (inWorld) {
                            sendMessage('Next: ' + BossActions[3000][InversedAction[BossMessages[msgId]]].msg);
                        } else {
                            sendMessage('Next: ' + BossActions[3000][BossMessages[msgId]].msg);
                        }
                    }
                }
            });

        }
    }
	
	function unload() {
		if(hooks.length) {
			for(let h of hooks) mod.unhook(h)

			hooks = []
		}
	}

	function hook() {
		hooks.push(mod.hook(...arguments))
	}
    
    function configInit() {
        if (config) {
            ({enabled,sendNotices,showItems,showOnlyMech} = config);
        } else {
            mod.command.message("(vs-guide) Error: Unable to load config.json - Using default values for now");
        }
    } 
}