import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useNavigate} from 'react-router-dom';
import React, { useState,useRef,useEffect,useMemo } from 'react'
import UIfx from 'uifx'
import space from './sounds/space.mp3';
import { useTable,usePagination } from 'react-table';
import Moralis from 'moralis';
import { ASTEROID_CONTRACT,ASTEROID_ABI } from './contract';


const spacesound = new UIfx(
  space,
  {
    volume: 0.4, // number between 0.0 ~ 1.0
    throttleMs: 10
  }
)

const serverUrl=process.env.REACT_APP_MORALIS_SERVER_URL;
const appId= process.env.REACT_APP_MORALIS_APP_ID;
export default function Lobby() {
  const [authenticated,setAuthenticated] = useState(false) ;
  const [gameData,setGameData] = useState([]);
  const [msgOpen,setMsgOpen]  = useState(false);
  const [message,setMessage]  = useState();

  const [msgTitle,setMsgTitle]  = useState();

  const subscribeToGame = useRef();
  
async function logout()
{
  Moralis.User.logOut();
  {
    setAuthenticated(false);
  }
  
}

async function login()
{
  let user = Moralis.User.current();
  if (!user) {
    await Moralis.enableWeb3();
    const chainId = await Moralis.getChainId();
   // alert(chainId)
  //  if(chainId ==43113) //Avalanche Fuji Testnet
    user = await Moralis.authenticate({ signingMessage: "Log in using Moralis",chainId:0xA869 })
      .then(function (user) {
        console.log("logged in user:", user);
        console.log(user.get("ethAddress"));
        setAuthenticated(true);
      })
      .catch(function (error) {
        console(error);
        alert(error);
      });
}

}
useEffect(()=>{
  Moralis.start({ serverUrl, appId });
  let user = Moralis.User.current();
  if(user)
  {
    setAuthenticated(true);
  }
  
  const Game = Moralis.Object.extend("Game");
   
  async function getGames()
  {
   const queryGames = new Moralis.Query(Game);
   const web3 = await Moralis.enableWeb3();

   queryGames.equalTo("player2", "waiting");
   let games = [];
   queryGames.find().then(function(object){
      object.forEach((_game)=>{
        console.log(_game.get("player1"))
          games.push({col1:_game.get("player1"),col2:_game.get("player2"),
          col3:web3.utils.fromWei(_game.get("bounty").toString()),id:_game.id,gameid:_game.get("gameid")});
      });
      console.log(games)
      setGameData(games);
   });

}
   async function getGameInfo()
   {
    
    
   // const player1Query = new Moralis.Query("Game");
    //const player2Query = new Moralis.Query("Game");
    //player1Query.equalTo("player1",user.get("ethAddress") );
    //player2Query.equalTo("player2",user.get("ethAddress") );
    const query = new Moralis.Query("Game");//Moralis.Query.or(player2Query,player1Query);
    //const query = player1Query;
    //query.equalTo("player",user.get("ethAddress") );
    //subscribeToJoinGame.current = await query.subscribe();
    subscribeToGame.current = await query.subscribe();
    subscribeToGame.current.on('create', (object) => {
    
          if(object.get("player1").localeCompare(user.get("ethAddress"))==0)
          navigate(`/game/${object.id}`);
      

    });

    subscribeToGame.current.on('update', (object) => {
      
        if(object.get("update").localeCompare("canstart")==0 && object.get("player2").localeCompare(user.get("ethAddress"))==0)   
         navigate(`/game/${object.id}`);
  

   });
    
  }
   getGames();
   getGameInfo();
    return function cleanup()
    {
      if(subscribeToGame.current)
        subscribeToGame.current.unsubscribe();

       
     }

  
  
},[])



  const [screen] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    ratio: window.devicePixelRatio || 1,
  });

  const [open, setOpen] = useState(false);
  
  const bounty = useRef();
  const navigate = useNavigate();
  const handleClickOpen = () => {
    setOpen(true);
  };

  async function handleJoinGame(gameid,_bounty)

  {

    const web3 = await Moralis.enableWeb3();
    const contract = new web3.eth.Contract(ASTEROID_ABI, ASTEROID_CONTRACT);
    let user = Moralis.User.current();

    contract.methods.initPlayerTwo(gameid).send({from:user.get("ethAddress"),gasLimit:3000000,value:web3.utils.toWei(_bounty)})
    .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
    }).on('receipt', function(error, receipt) {
         //Waiting for live query then proceed to game
        
     });          
    
 

    
  }

  const handleMsgClose = () => {
    setMsgOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };
  const handleCreate = async () =>{
     console.log(bounty)
    if(bounty.current.value !=null && bounty.current.value != '')
    {
       const web3 = await Moralis.enableWeb3();
       const contract = new web3.eth.Contract(ASTEROID_ABI, ASTEROID_CONTRACT);
       let user = Moralis.User.current();

       contract.methods.initPlayerOne(web3.utils.toWei(bounty.current.value)).send({from:user.get("ethAddress"),gasLimit:3000000,value:web3.utils.toWei(bounty.current.value)})
       .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
       
        setMessage("Create Game.");
        setMsgOpen(true);
        setMsgTitle("Error Creating Game");

       }).on('receipt', function(error, receipt) {
            //Waiting for live query then proceed to game
        });          
       
    


           }
      }
  const data = useMemo(
    () => 
      
      gameData
    ,

    [authenticated,gameData]
  )

  const columns = useMemo(
    () => [
      {
        Header: 'Player 1',
        accessor: 'col1', // accessor is the "key" in the data
      },
      {
        Header: 'Player 2',
        accessor: 'gameid',
        Cell: ({ cell }) => (
            <button className="joinbutton" hidden={!authenticated}
            onClick ={() => handleJoinGame(cell.row.values.gameid,cell.row.values.col3)}
            >
              Join Game
            </button>
          )
      },
      {
        Header: 'Bounty',
        accessor: 'col3', // accessor is the "key" in the data
        Cell: ({ cell }) => (<span>{cell.row.values.col3} AVAX</span> )
      }
    ],
    [authenticated,gameData]
  )
//  const tableInstance = useTable({ columns, data },usePagination)
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    pageOptions,
    page,
      state: { pageIndex, pageSize },
      gotoPage,
       previousPage,
       nextPage,
      setPageSize,
      pageCount,

       canPreviousPage,
       canNextPage,
       
  } =  useTable({ columns, data , initialState: { pageIndex: 0 }},usePagination)
  useEffect(()=>{
    spacesound.play();

  },[])
  const canvas = useRef();
    console.log(screen);
        return (
            <div >
            <span className="welcome current-score" >Welcome</span>

            <span className="titleLobby top-score" >Asteroids</span>
            <span className="lobby" >
             Game Lobby
              
            </span>
           

<div className="creategame" hidden={!authenticated}>
          <button
          onClick={handleClickOpen}
           >
            Create Game
          </button>
        </div>

        <div className="loginbutton" hidden={authenticated}>
          <button
          onClick={login}
           >
            Login
          </button>
        </div>

        <div className="loginbutton" hidden={!authenticated}>
          <button
          onClick={logout}
           >
            Logout
          </button>
        </div>
   <div>          
   <table  className="gametable table" {...getTableProps()}>
     <thead>
       {// Loop over the header rows
       headerGroups.map(headerGroup => (
         // Apply the header row props
         <tr {...headerGroup.getHeaderGroupProps()}>
           {// Loop over the headers in each row
           headerGroup.headers.map(column => (
             // Apply the header cell props
             <th {...column.getHeaderProps()}>
               {// Render the header
               column.render('Header')}
             </th>
           ))}
         </tr>
       ))}
     </thead>
     {/* Apply the table body props */}
     <tbody {...getTableBodyProps()}>
       {// Loop over the table rows
       page.map(row => {
         // Prepare the row for display
         prepareRow(row)
         return (
           // Apply the row props
           <tr {...row.getRowProps()}>
             {// Loop over the rows cells
             row.cells.map(cell => {
               // Apply the cell props
               return (
                 <td {...cell.getCellProps()}>
                   {// Render the cell contents
                   cell.render('Cell')}
                 </td>
               )
             })}
           </tr>
         )
       })}
     </tbody>
     <tfoot> <tr><td colspan="3"> {/* 
        Pagination can be built however you'd like. 
        This is just a very basic UI implementation:
      */}
      <div className="pagination">
        <button className = "pagebutton" onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {'<<'}
        </button>{' '}
        <button className = "pagebutton" onClick={() => previousPage()} disabled={!canPreviousPage}>
          {'<'}
        </button>{' '}
        <button className = "pagebutton" onClick={() => nextPage()} disabled={!canNextPage}>
          {'>'}
        </button>{' '}
        <button className = "pagebutton" onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {'>>'}
        </button>{' '}
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={pageIndex + 1}
            onChange={e => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              gotoPage(page)
            }}
            style={{ width: '100px' }}
          />
        </span>{' '}
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
      </td></tr>
  </tfoot>
   </table>
      </div>
      <div>
      
      <Dialog  open={open} onClose={handleClose}>
        <DialogTitle class="dialogHeaderText">Create Game</DialogTitle>
        <DialogContent>
          <DialogContentText >
           <span class="dialogText">Create a new 1 vs 1 Asteroid Game. Please enter your bounty.</span>
          </DialogContentText>
          <TextField
          inputRef={bounty}
            autoFocus
            margin="dense"
            id="name"
            label="Bounty"
            type="number"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button class = "dialogButtonText" onClick={handleClose}>Cancel</Button>
          <Button class ="dialogButtonText" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>

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
   
            </div>
   
)
    }

