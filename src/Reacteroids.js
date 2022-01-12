import React, { useState,useEffect,useRef} from 'react';
import Ship from './Ship';
import Asteroid from './Asteroid';
import { randomNumBetweenExcluding } from './helpers'
import UIfx from 'uifx'
import gameover from './sounds/gameover.mp3';
import gamestart from './sounds/gamestart.mp3';
import Moralis  from 'moralis';
import { useParams,useNavigate } from "react-router-dom";
import Bullet from './Bullet';

const startgame = new UIfx(
  gamestart,
  {
    volume: 0.4, // number between 0.0 ~ 1.0
    throttleMs: 10
  }
)
const _endgame = new UIfx(
  gameover,
  {
    volume: 0.4, // number between 0.0 ~ 1.0
    throttleMs: 10
  }
)
const KEY = {
  LEFT:  37,
  RIGHT: 39,
  UP: 38,
  A: 65,
  D: 68,
  W: 87,
  SPACE: 32
};

export default  function Reacteroids()  {
    
      const [screen,setScreen] = useState( {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      });

      const context = useRef(null);
      const keys = useRef({
        left  : 0,
        right : 0,
        up    : 0,
        down  : 0,
        space : 0,
      });

    const asteroidCount = useRef(3);
    const [currentScore,setCurrentScore] = useState (0);
    const [topScore,setTopScore] = useState(localStorage['topscore'] || 0);
    const player1Score = useRef(0);
    const player2Score = useRef(0); 
    const [displayPlayer1Score,setDisplayPlayer1Score] = useState(0);
    const [displayPlayer2Score,setDisplayPlayer2Score] = useState(0)
    const inGame =  useState(false);
    const gameOverPlayer1 = useRef(false);
    const gameOverPlayer2 =  useRef(false);
    const [playersJoined,setPlayersJoined]  = useState(false);
    const [ship,setShip] = useState([]);
    const [ship2,setShip2] = useState([]);
    const asteroids = useRef([]);
    const bullets = useRef([]);
    const particles = useRef([]);
    const player = useRef(null);
    const gameInfo  = useRef(null);
    const refs = useRef();
    const {id} = useParams();
    const serverUrl=process.env.REACT_APP_MORALIS_SERVER_URL;
    const appId= process.env.REACT_APP_MORALIS_APP_ID;
    const navigate = useNavigate();
    const subscribeToGame = useRef();
    const subscribeToPlayerPosition = useRef();
    const subscribeToBullets = useRef();
    const subscribeToAsteroids = useRef();
    const playerPosition= useRef();
    const gotAsteroids = useRef();
    const lastShipPosition  = useRef(false);
  function handleResize(value, e){
    setScreen(
       {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      }
    );
  }

  function handleKeys(value, e){
    let _keys = keys.current;
    if(e.keyCode === KEY.LEFT   || e.keyCode === KEY.A) _keys.left  = value;
    if(e.keyCode === KEY.RIGHT  || e.keyCode === KEY.D) _keys.right = value;
    if(e.keyCode === KEY.UP     || e.keyCode === KEY.W) _keys.up    = value;
    if(e.keyCode === KEY.SPACE) _keys.space = value;

   /* setKeys(
      _keys
    );*/

    keys.current = _keys;
  }

  useEffect(()=>{
    if(playersJoined==true)
    {
      startGame();
      playerPositionListener();
      bulletListener();
      requestAnimationFrame(() => {update()});
      
    }
  },[playersJoined]);
  
  async function asteroidListener()
  {
     const _Asteroid =  Moralis.Object.extend("Asteroid");
     const query = new Moralis.Query(_Asteroid);
     query.equalTo("gameid",gameInfo.current.get("gameid"));
     subscribeToAsteroids.current = await query.subscribe();
     subscribeToAsteroids.current.on('create', (object) => {
       gotAsteroids.current = true;
       const _asteroid = JSON.parse(object.get("asteroid"));
       console.log(_asteroid);
       const newAsteroid = new Asteroid({
        size: 80,
        position: {
          x:_asteroid.position.x,
          y:_asteroid.position.y
           },
        velocity:{
         x:_asteroid.velocity.x,
         y:_asteroid.velocity.y
        },   
        create: createAsteroid.bind(this), 
        addScore: addScore.bind(this)
      });
       asteroids.current.push(newAsteroid);
       console.log(`${player.current} Got Asteroids`)
     });
  }

  async function bulletListener()
  {
    const ShipBullet = Moralis.Object.extend("Bullet");
    const query = new Moralis.Query(ShipBullet);
    query.equalTo("gameid",gameInfo.current.get("gameid"));
   console.log(gameInfo.current.get("gameid"))
    if(player.current.localeCompare("player1") == 0)
       query.equalTo("player","player2"); //Listen to ship positions for player 2 if you are player 1
    else
       query.equalTo("player","player1"); //Listen to ship positions for player 1 if youare player 2
     console.log(player) 
    subscribeToBullets.current = await query.subscribe();
    subscribeToBullets.current.on('create', (object) => {
       const bullet = new Bullet({ship: (object.get("player").localeCompare("player1")== 0 ? ship[0]:ship[1] )});

       bullets.current.push(bullet);  
       //console.log("Got Position")
    });
  }

  async function playerPositionListener()
  { 
    const ShipPosition = Moralis.Object.extend("ShipPosition");
    const query = new Moralis.Query(ShipPosition);
    query.equalTo("gameid",gameInfo.current.get("gameid"));
   console.log(gameInfo.current.get("gameid"))
    if(player.current.localeCompare("player1") == 0)
       query.equalTo("player","player2"); //Listen to ship positions for player 2 if you are player 1
    else
       query.equalTo("player","player1"); //Listen to ship positions for player 1 if youare player 2
     console.log(player) 
    subscribeToPlayerPosition.current = await query.subscribe();
    subscribeToPlayerPosition.current.on('create', (object) => {
       playerPosition.current = object;  
       console.log("Got Position")
    });     
  }

  //Initial setup and configuration when players enter the game
  useEffect(() => {
     async function getGameInfo()
   {
    window.addEventListener('keyup',   handleKeys.bind(this, false));
    window.addEventListener('keydown', handleKeys.bind(this, true));
    window.addEventListener('resize',  handleResize.bind(this, false));

    context.current = refs.current.getContext('2d');
    //startGame();
    //requestAnimationFrame(() => {update()});

    Moralis.start({ serverUrl, appId });

    const Game = Moralis.Object.extend("Game");
    const query = new Moralis.Query(Game);
    query.equalTo("objectId", id);
    subscribeToGame.current = await query.subscribe();

    query.first().then(function(result){
     //console.log(result);
     gameInfo.current=result;

     if(result != undefined)
     {
         let user = Moralis.User.current();
         let ethAddress  =user.get("ethAddress");
         asteroidListener();     
         if(result.get("player1").localeCompare(ethAddress) !=0 && result.get("player2").localeCompare(ethAddress) !=0)
         {
             navigate("/"); //Navigate back to the lobby because you haven't joined or created this game
         }
         else
         {

          if(result.get("player1").localeCompare(ethAddress) ==0 )
          {
             player.current ="player1";

         
          }

          if(result.get("player2").localeCompare(ethAddress) ==0 )
          {
             player.current="player2";
             setPlayersJoined(true);  

          }
           
               //Subscribe to game updates to know when player joins the game
               subscribeToGame.current.on('update', (object) => {
                //console.log(object);
                //Player 2 join the game 
                if(object.get("update").localeCompare("player2") == 0 && player.current.localeCompare("player1") == 0 && !object.get("over"))
                {
                   setPlayersJoined(true);  
   
                }
                
                if(object.get("update").localeCompare("score1") == 0)
                {
                     setDisplayPlayer1Score(object.get("score1"));
   
                }
   
                if(object.get("update").localeCompare("score2") == 0)
                {
                     setDisplayPlayer2Score(object.get("score2"));
   
                }
               
               });
   


         }
        
  
      }
     
    });

  }
   getGameInfo();
    return function cleanup()
    {
      window.removeEventListener('keyup', handleKeys);
      window.removeEventListener('keydown', handleKeys);
      window.removeEventListener('resize', handleResize);
      
      if(subscribeToGame.current)
        subscribeToGame.current.unsubscribe();

      if(subscribeToPlayerPosition.current)
         subscribeToPlayerPosition.current.unsubscribe();

      if(subscribeToBullets.current)
         subscribeToBullets.current.unsubscribe(); 
      
      if(subscribeToAsteroids.current)
         subscribeToAsteroids.current.unsubscribe();        
    }
  },[])

  
  function update() {
    //console.log(context)
    const _context = context.current;
    const _keys = keys;
    const _ship = ship[0];
    const _ship2 = ship2[0];
    _context.save();
     
    //const ratio = (screen.ratio > 1 ? screen.ratio : screen.ratio);
    _context.scale(screen.ratio ,screen.ratio);
    //_context.scale(1, 1);
    console.log(screen);

    // Motion trail
    _context.fillStyle = '#000';
    _context.globalAlpha = 0.4;
    _context.fillRect(0, 0, screen.width, screen.height);
    _context.globalAlpha = 1;

    // Next set of asteroids
    if(!asteroids.current.length){
      //let count = asteroidCount.current + 1;
      //setAsteroidCount(count);
      asteroidCount.current += 1;
      //Player 1 generates the asteroids.  
      //If player one's game is over player 2 generates them.
      
      if(gotAsteroids.current)
        generateAsteroids(asteroidCount.current);
      gotAsteroids.current  =false; 
    }

    // Check for colisions
    checkCollisionsWith(bullets.current, asteroids.current,"bullets");
    checkCollisionsWith(ship,asteroids.current,"ship");
    //checkCollisionsWith(ship2, asteroids);

    // Remove or render
    updateObjects(particles.current, 'particles')
    updateObjects(asteroids.current, 'asteroids')
    updateObjects(bullets.current, 'bullets')
    updateObjects(ship, 'ship')
    //this.updateObjects(this.ship2,'ship2')
    _context.restore();

    // Next frame
    requestAnimationFrame(() => {update()});
  }

  function addScore(points,_player){
    console.log(_player);
    console.log(points);
    console.log(player.current)
    
     const gScore = gameInfo.current;

      if(player.current.localeCompare(_player)==0 && player.current.localeCompare("player1")==0)
      {
         console.log("Score for Player 1")
         player1Score.current += points;
         gScore.set("score1",player1Score.current);
         gScore.set("update","score1");
      }

      if(player.current.localeCompare(_player)==0 && player.current.localeCompare("player2")==0)
      {
        console.log("Score for Player 2")
         player2Score.current += points;
         gScore.set("score2",player2Score.current);
         gScore.set("update","score2");
      }
      
      gScore.save();
      

    
  }

  function startGame(){
    startgame.play();
    
       inGame.current = true;
      setCurrentScore(0);
      gameOverPlayer1.current=false;
      gameOverPlayer2.current=false;
    
    // Make ship
    let ship = new Ship({name:'player1',
      position: {
        x: (screen.width/4)*3,
        y: screen.height/2
      },
      create: createObject.bind(this),
      onDie: gameOver.bind(this,"player1")
    });


        
    createObject(ship, 'ship');

    let ship2 = new Ship({name:'player2',
      position: {
        x: screen.width/4,
        y: screen.height/2
      },
      create: createObject.bind(this),
      onDie: gameOver.bind(this,"player2")
    });
    createObject(ship2, 'ship');


    // Make asteroids
    asteroids.current = [];
    if(player.current.localeCompare('player1') ==0)
    generateAsteroids(asteroidCount.current);
  }

  function gameOver(player){

    //alert(player)
    if(player == "player1")

     gameOverPlayer1.current=true;
  

    else if(player=="player2")
   
      gameOverPlayer2.current=true;
     
   /*this.setState({
      inGame: false,
    });*/

    // Replace top score
    if(currentScore > topScore){
    
        setTopScore(currentScore);
    
      localStorage['topscore'] = currentScore;
    }

    if(gameOverPlayer1 && gameOverPlayer2)
      _endgame.play();
  }

  function generateAsteroids(howMany){
    let asteroids = [];
    let _ship = ship[0];
    for (let i = 0; i < howMany; i++) {
      let asteroid = new Asteroid({
        size: 80,
        position: {
          x: randomNumBetweenExcluding(0, screen.width, _ship.position.x-60, _ship.position.x+60),
          y: randomNumBetweenExcluding(0, screen.height, _ship.position.y-60, _ship.position.y+60)
        },
        create: createAsteroid.bind(this),
        addScore: addScore.bind(this)
      });
      //createObject(asteroid, 'asteroids');
      //save asteroid to database
      const _Asteroid = Moralis.Object.extend("Asteroid");
      const _asteroid = new _Asteroid();
      _asteroid.set("gameid",gameInfo.current.get("gameid"));
      _asteroid.set("asteroid",JSON.stringify(asteroid));
      _asteroid.save();
    }
  }
  
 function createAsteroid(item)
{
   asteroids.current.push(item);
}

  function createObject(item, group){
    if(group=='ship')
    {
      let _ship = ship;
      _ship.push(item); 
      setShip(_ship);
    }  

    if(group=='bullets')
    {
      //let _bullets = bullets.current;
      bullets.current.push(item);
      const _Bullet = Moralis.Object.extend("Bullet");
      const _bullet = new _Bullet();
      _bullet.set("player",player.current);
      _bullet.set("gameid",gameInfo.current.get("gameid"));
      _bullet.set("bullet",JSON.stringify(item));  
      _bullet.save();
      //bullets.current = _bullets;
    }

   /* if(group == "asteroids")
    {
       asteroids.current.push(item);
    }*/

  }

  function updateObjects(items, group){
   /* if(group=='bullets')
    console.log(items.ship);

    */
    let index = 0;
    for (let item of items) {
      if (item.delete) {
      {  
        //I have to refactor this not sure how it affects the game
        //this[group].splice(index, 1);
        if(group == 'bullets')
        {
            // let b = bullets.current;
             bullets.current.splice(index,1);
            // bullets.current =b;
        }
   
        if(group == 'asteroids')
        {
            
            asteroids.current.splice(index,1);
            
        }

        if(group == 'particles')
        {
            
            particles.current.splice(index,1);
            
        }

        if(group == 'ship')
        {
            let _ship = ship;

           setShip( _ship.splice(index,1));
            
        }




       // console.log(items)
      }
      }else{
       
        if(group == 'ship') 
        {
          if(items[index].name == player.current) 
          {
             items[index].render({keys:keys.current,screen:screen,context:context.current});
            // console.log(items[index]);
             if(keys.current.up  || keys.current.space   || keys.current.left  || keys.current.right)
             {

                              
                const ShipPosition = Moralis.Object.extend("ShipPosition");
                const shipPos = new ShipPosition();
                shipPos.set("gameid",gameInfo.current.get("gameid"));
                shipPos.set("positionx",items[index].position.x);
                shipPos.set("positiony",items[index].position.y);
                shipPos.set("player",items[index].name);
                shipPos.set("rotation",items[index].rotation);
                shipPos.set("rotationspeed",items[index].rotationSpeed);
                shipPos.set("speed",items[index].speed);
                shipPos.set("inertia",items[index].inertia);
                shipPos.set("velocityy",items[index].velocity.y);
                shipPos.set("velocityx",items[index].velocity.x);

                shipPos.set("radius",items[index].radius);
                shipPos.set("lastshot",items[index].lastShot);
                if(lastShipPosition.current) 
                {
                   if(
                    lastShipPosition.current.get("positionx") != shipPos.get("positionx") ||
                    lastShipPosition.current.get("positiony") != shipPos.get("positiony") ||
                    lastShipPosition.current.get("velocityx")!= shipPos.get("velocityx") ||
                    lastShipPosition.current.get("velocityy") != shipPos.get("velocityy") ||
                 lastShipPosition.current.get("rotation") != shipPos.get("rotation") ||

                    lastShipPosition.current.get("rotationspeed") != shipPos.get("rotationspeed") ||
                    lastShipPosition.current.get("gameid") != shipPos.get("gameid") ||
                    lastShipPosition.current.get("speed") != shipPos.get("speed") ||
                    lastShipPosition.current.get("inertia") != shipPos.get("inertia") ||
                    lastShipPosition.current.get("radius") != shipPos.get("radius") ||
                    lastShipPosition.current.get("lastshot") != shipPos.get("lastshot"))
                  
                    
                   {
                      shipPos.save();
                      lastShipPosition.current = shipPos;
                     // console.log("New Position")
                      //console.log(lastShipPosition.current);
                     // console.log(shipPos)
                   }  
                 else
                 {
                   // console.log("Not old or new")

                   // console.log(lastShipPosition.current.get("positionx"))
                 }    
              }
              else
              {
                console.log("Last")
                shipPos.save();
                lastShipPosition.current = shipPos;

              }         
             }
           
           /*  if(keys.up || keys.space || keys.left || keys.right)
             {
                const ShipPosition = Moralis.Object.extend("KeysPressed");
                const shipPos = new ShipPosition();
                shipPos.set("keys",JSON.stringify(keys));
                shipPos.set("gameid",gameInfo.current.get("gameid"));
                shipPos.set("player",player);
                shipPos.save();
             }*/   
          }
          else
          {
            //items[index].position.x +=1;
            if(playerPosition.current)
            {
              items[index].position.x = playerPosition.current.get("positionx");
              items[index].position.y = playerPosition.current.get("positiony");
              items[index].rotation = playerPosition.current.get("rotation");
              items[index].rotationSpeed = playerPosition.current.get("rotationspeed");
              items[index].speed = playerPosition.current.get("speed");
              items[index].inertia = playerPosition.current.get("inertia");
              items[index].velocity.x = playerPosition.current.get("velocityx");
        
              items[index].velocity.y = playerPosition.current.get("velocityy");
              items[index].radius = playerPosition.current.get("radius");
              items[index].lastShot = playerPosition.current.get("lastshot");
              //console.log(playerPosition)
            }
               
            /* console.log(items[index])*/
            // console.log("what")
             /*let k={} ;
             if(playerPosition.current)
             {
                 k = JSON.parse(playerPosition.current.get("keys"));  
                 console.log("not")
             }*/

             items[index].render({keys:{},screen:screen,context:context.current});
             playerPosition.current= false;
          }
        }
        if(group=='bullets')
        {
           items[index].render({screen:screen,context:context.current}); 
        } 

        if(group=='asteroids')
        {
           items[index].render({screen:screen,context:context.current}); 
        } 

        if(group=='particles')
        {
           items[index].render({screen:screen,context:context.current}); 
        }
        
      }
      index++;
    }
  }

  function checkCollisionsWith(items1, items2,group1) {
    var a = items1.length - 1;
    var b;
    for(a; a > -1; --a){
      b = items2.length - 1;
      for(b; b > -1; --b){
        var item1 = items1[a];
        var item2 = items2[b];
        if(checkCollision(item1, item2)){
          
          
          if(group1 == 'bullets')
          {
              item1.destroy();

              item2.destroy(item1.ship);
            }   
          else
          {
            item1.destroy();
  
            item2.destroy(item1.name);    
          }
        }
      }
    }
  }

  function checkCollision(obj1, obj2){
    var vx = obj1.position.x - obj2.position.x;
    var vy = obj1.position.y - obj2.position.y;
    var length = Math.sqrt(vx * vx + vy * vy);
    if(length < obj1.radius + obj2.radius){
      return true;
    }
    return false;
  }
  
  function AwaitingPlayer()
  {
    if(!playersJoined){
      return (
        <div className="awaitingPlayer">
          <p>Awaiting Player 2</p>
         
        </div>
      )
     
    }
    else
    return(null)
  }

  function Endgame() {
    let endgame;
    let message;

    if (currentScore <= 0) {
      message = '0 points... So sad.';
    } else if (currentScore >= topScore){
      message = 'Top score with ' + currentScore + ' points. Woo!';
    } else {
      message = currentScore + ' Points though :)'
    }

    if(gameOverPlayer1.current && gameOverPlayer2.current ){
      return (
        <div className="endgame">
          <p>Game over, man!</p>
          <p>{message}</p>
          <button
            onClick={ startGame.bind(this) }>
            try again?
          </button>
        </div>
      )
     
    }
    else
    return(null)
  }

    return (
      <div>
        <Endgame />
        <AwaitingPlayer />
        <span className="score current-score" >Player 1: {displayPlayer1Score}</span>

        <span className="score top-score" >Player 2: {displayPlayer2Score}</span>
        <span className="controls" >
          Use [A][S][W][D] or [←][↑][↓][→] to MOVE<br/>
          Use [SPACE] to SHOOT
          
        </span>
        <canvas ref={refs}
          width={screen.width * screen.ratio}
          height={screen.height * screen.ratio}
        />
      </div>
    );
  
}
