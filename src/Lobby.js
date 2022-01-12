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
    alert("not user")
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
   const queryGames = new Moralis.Query(Game);
   queryGames.equalTo("player2", "waiting");
   let games = [];
   queryGames.find().then(function(object){
      object.forEach((_game)=>{
        console.log(_game.get("player1"))
          games.push({col1:_game.get("player1"),col2:_game.get("player2"),
          col3:_game.get("bounty"),id:_game.id});
      });
      console.log(games)
      setGameData(games);
   });

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

  function handleJoinGame(gid)
  {
     let user = Moralis.User.current();

    const Game = Moralis.Object.extend("Game");
    const g = new Game();
    g.set("id",gid);
    g.set("update","player2");
    g.set("player2",user.get("ethAddress"));
    g.save().then((obj)=>{
      navigate(`/game/${gid}`);
    });
    
  }
  const handleClose = () => {
    setOpen(false);
  };
  const handleCreate = () =>{
     console.log(bounty)
    if(bounty.current.value !=null && bounty.current.value != '')
    {
        let user = Moralis.User.current();

        const Game  = Moralis.Object.extend("Game");
        const game = new Game();
        game.set("gameid",parseInt(bounty.current.value));
        game.set("player1",user.get("ethAddress"));
        game.save().then(()=>
         { 
            setOpen(false);
            navigate("/game/1")
         })
    }
      }
  const data = useMemo(
    () => 
      /*{
        col1: 'Hello',
        col2: 'World',
        col3: 12
      },
      {
        col1: 'react-table',
        col2: 'rocks',
        col3: 12
      },
      {
        col1: 'whatever',
        col2: 'you want',
        col3: 12
      },*/
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
        accessor: 'id',
        Cell: ({ cell }) => (
            <button className="joinbutton" hidden={!authenticated}
            onClick ={() => handleJoinGame(cell.row.values.id)}
            >
              Join Game
            </button>
          )
      },
      {
        Header: 'Bounty',
        accessor: 'col3', // accessor is the "key" in the data
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
            <div>
            <span className="welcome current-score" >Welcome</span>

            <span className="titleLobby top-score" >Asteroids</span>
            <span className="lobby" >
             Game Lobby
              
            </span>
            <canvas ref={canvas}
          width={screen.width * screen.ratio}
          height={screen.height * screen.ratio}
        />

// apply the table props
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
   </table>
    {/* 
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
   
      <div>
      
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Create Game</DialogTitle>
        <DialogContent>
          <DialogContentText>
           Create a new 1v1 Asteroid Game. Please enter your bounty.
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
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </div>
   
            </div>
   
)
    }

