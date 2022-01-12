import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import{BrowserRouter as Router,Route,Routes} from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
import Reacteroids from './Reacteroids';
import style from './style.css';
import Lobby from './Lobby';

ReactDOM.render(
  <React.StrictMode>
    

   <Router>
    <Routes>
   <Route exact path="/" element={<Lobby/>} /> 
   <Route exact path="/game/:id" element={<Reacteroids />} />
 </Routes>
  </Router>
   </React.StrictMode>,
    document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
