import React, { useState,useEffect,useRef} from 'react';
import Ship from './Ship';
import Asteroid from './Asteroid';
import { randomNumBetweenExcluding } from './helpers'
import UIfx from 'uifx'
import gameover from './sounds/gameover.mp3';
import gamestart from './sounds/gamestart.mp3';
import Moralis  from 'moralis';
import { useParams,useNavigate } from "react-router-dom";
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { ASTEROID_CONTRACT,ASTEROID_ABI } from './contract';

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
    const [endgame,setEndGame]  = useState();
    const player1Score = useRef(0);
    const player2Score = useRef(0); 
    const [displayPlayer1Score,setDisplayPlayer1Score] = useState(0);
    const [displayPlayer2Score,setDisplayPlayer2Score] = useState(0)
    const inGame =  useState(false);
    const gameOverPlayer1 = useRef(false);
    const gameOverPlayer2 =  useRef(false);
    const [playersJoined,setPlayersJoined]  = useState(false);
    const ship = useRef([]);
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
    const [msgOpen,setMsgOpen]  = useState(false);
    const [message,setMessage]  = useState();

  const [msgTitle,setMsgTitle]  = useState();

  const handleMsgClose = () => {
    setMsgOpen(false);
  };

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

    keys.current = _keys;
  }

  useEffect(()=>{
    if(playersJoined==true)
    {
      startGame();
      requestAnimationFrame(() => {update()});
      
    }
  },[playersJoined]);
  
 
 
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
         if(result.get("player1").localeCompare(ethAddress) !=0 && result.get("player2").localeCompare(ethAddress) !=0)
         {
             navigate("/"); //Navigate back to the lobby because you haven't joined or created this game
         }
         else
         {
           if(result.get("over")==true)
             navigate("/")
             
          if(result.get("player1").localeCompare(ethAddress) ==0 )
          {
             player.current ="player1";

             
          }

          if(result.get("player2").localeCompare(ethAddress) ==0 )
          {
             player.current="player2";
             result.set("update","player2");
             result.save();
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
                     if(player.current.localeCompare("player1") !=0)
                       player1Score.current = (object.get("score1"));
                  
   
                }
   
                if(object.get("update").localeCompare("score2") == 0)
                {
                     setDisplayPlayer2Score(object.get("score2"));
                     if(player.current.localeCompare("player2") !=0)
                     player2Score.current = (object.get("score2"));
                  
 
                }


               if(object.get("update").localeCompare("gameoverplayer1") == 0)
                {
                    //alert("1")
                    gameOverPlayer1.current =true;
                    gameOverPlayer2.current = object.get("gameoverplayer2");
                    gameOver("player1");
                }
               
                if(object.get("update").localeCompare("gameoverplayer2") == 0)
                {
                  //alert(2);
                  gameOverPlayer1.current = object.get("gameoverplayer1");
                  gameOverPlayer2.current = true;
                  gameOver("player2");
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

    }
  },[])

  
  function update() {
    //console.log(context)
    const _context = context.current;
    const _keys = keys;
    const _ship = ship.current[0];
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
      
        generateAsteroids(asteroidCount.current);
    }

    // Check for colisions
    checkCollisionsWith(bullets.current, asteroids.current,"bullets");
    checkCollisionsWith(ship.current,asteroids.current,"ship");
    
    // Remove or render
    updateObjects(particles.current, 'particles')
    updateObjects(asteroids.current, 'asteroids')
    updateObjects(bullets.current, 'bullets')
    updateObjects(ship.current, 'ship')
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
    let _ship = new Ship({name:player.current,
      position: {
        x: screen.width/2,
        y: screen.height/2
      },
      create: createObject.bind(this),
      onDie: playerDied.bind(this,player.current,gameInfo.current)
    });


        
    createObject(_ship, 'ship');

    
    // Make asteroids
    asteroids.current = [];
    generateAsteroids(asteroidCount.current);
  }
  
  async function playerDied(player,_game)
  {
     const x = await Moralis.Cloud.run("playerDied",{gameid:_game.get("gameid"),player:player});
     if(player.current.localeCompare("player1")==0)
        gameOverPlayer1.current = true;

     if(player.current.localeCompare("player2")==0)
        gameOverPlayer2.current = true;
   

  }

  function gameOver(player){

   //alert(`${gameOverPlayer1.current}  ${gameOverPlayer2.current}`)
   if(gameOverPlayer1.current && gameOverPlayer2.current)
   {
      const _game = gameInfo.current;
      _game.set("over",true);
      _game.set("update","gameover");
      _game.save(); 
      setEndGame(true);
   }
     

      _endgame.play();
  }

  async function claimBounty()
  {
    const web3 = await Moralis.enableWeb3();
    const contract = new web3.eth.Contract(ASTEROID_ABI, ASTEROID_CONTRACT);
    let user = Moralis.User.current();

    contract.methods.claimBounty(gameInfo.current.get("gameid"),gameInfo.current.get("gameid").toString()).send({from:user.get("ethAddress"),gasLimit:3000000})
    .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
    }).on('receipt', function(error, receipt) {
         //Waiting for live query then proceed to game
        navigate("/");
     });   
  }

  function generateAsteroids(howMany){
    let asteroids = [];
    let _ship = ship.current[0];
    for (let i = 0; i < howMany; i++) {
      let asteroid = new Asteroid({
        size: 80,
        position: {
          x: randomNumBetweenExcluding(0, screen.width, _ship.position.x-60, _ship.position.x+60),
          y: randomNumBetweenExcluding(0, screen.height, _ship.position.y-60, _ship.position.y+60)
        },
        create: createObject.bind(this),
        addScore: addScore.bind(this)
      });
      createObject(asteroid, 'asteroids');
      
    }
  }
  
 
  function createObject(item, group){
    if(group=='ship')
    {
     ship.current.push(item);
    }  

    if(group=='bullets')
    {
     
      bullets.current.push(item);
     }

    if(group == "asteroids")
    {
       asteroids.current.push(item);
    }

  }

  function updateObjects(items, group){
   
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
           ship.current =[];   
        }




       // console.log(items)
      }
      }else{
       
        if(group == 'ship') 
        {
             items[index].render({keys:keys.current,screen:screen,context:context.current});
           
           
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
    console.log(`${gameOverPlayer1.current} ${gameOverPlayer2.current}`)
    let endgame;
    let message;
    let showClaimButton = false;
    if (displayPlayer1Score > displayPlayer2Score) {
      message = `Congratulations Player 1 -  ${displayPlayer1Score} points`;
      if(player.current == "player1")
        showClaimButton = true;
    } else if (displayPlayer2Score > displayPlayer1Score){
      message = `Congratulations Player 2 - ${displayPlayer2Score} points`;
      if(player.current == "player2")
        showClaimButton = true;
    } else {
      message = 'Draw Game :)';
      showClaimButton = true;
    }

    if(gameOverPlayer1.current && gameOverPlayer2.current ){
      return (
        <div className="endgame">
          <p>Game over, man!</p>
          <p>{message}</p>
          <button hidden={!showClaimButton}
            onClick={ claimBounty.bind(this) }>
            Claim Bounty
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
         <Dialog open={msgOpen} onClose={handleMsgClose}>
        <DialogTitle class="dialogHeaderText">{msgTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <span class="dialogText"> {message}</span>
          </DialogContentText>
          </DialogContent>
        <DialogActions>
          <Button class="dialogButtonText" onClick={handleMsgClose}>Ok</Button>
        </DialogActions>
      </Dialog>
      </div>
    );
  
}
