    // Deployed on Avalanche TestNet: 
	// Fund Contract with Testnet Link and AVAX 
	// You will need to run your own node and oracle
	// The job TOML is also in this directory
    
    pragma solidity ^0.8.0;
	pragma experimental ABIEncoderV2;

    import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
    import "@openzeppelin/contracts/access/Ownable.sol";

    contract Asteroids is ChainlinkClient ,Ownable{
	   using Chainlink for Chainlink.Request;
       bytes32 internal keyHash;
       uint256 internal fee;
       address _oracle;
       bytes32 _jobId;
	   mapping(bytes32 => uint256) private r_request;
 
	    
        
        // Game states which can happen over the board 
        
        enum GameState { NOT_INITIATED, PlayerOneInit, PlayerTwoInit , PlayerOnePaid , PlayerTwoPaid, COMPLETED,PAYOUT_MADE }
        
        event GameID(address indexed player1,uint gameid,uint256 bounty);
        event GameStarted(uint gameId,address indexed player1,address indexed player2);
        event GameWinner(uint gameid,address indexed _winnerAddress,uint256 bounty);
        event TestEvent(string url,uint256 result);
        
        struct _Asteroids{
            // Checking the state of one game 
            GameState currState;
            
            // Checking if both players have joined 
            bool isPlayerOneIn;
            bool isPlayerTwoIn;
            
            // Crypto on the line 
            uint bet;
            
          
            
            // Addresses of both players 
            address payable PlayerOneAddress;
            address payable PlayerTwoAddress;
        }
        
        uint256 public curr_id = 0;
        
        mapping (uint256 => _Asteroids) public Games;
		
		
		constructor() {
        setChainlinkToken(0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846);
         _oracle = 0xE31Cc94CFc1489B7Edd65f3D3a7aebE9A559F879; //My Node
        _jobId = "fc3ea215bb9e44e088107b29bb495e2d"; //My Node
        fee = 0.1 * 10 ** 18; // (Varies by network and job)
    }
        
        function initPlayerOne(uint256 _bettingAmount) public payable returns (uint)
        {
            require(Games[curr_id].currState == GameState.NOT_INITIATED);
            Games[curr_id].isPlayerOneIn = true;
            Games[curr_id].PlayerOneAddress = payable(msg.sender);
            Games[curr_id].bet = _bettingAmount;
            
			
            require(msg.value == Games[curr_id].bet,"Wrong Deposit Amount");
            Games[curr_id].currState = GameState.PlayerOnePaid;
            
			emit GameID(msg.sender,curr_id,_bettingAmount);
			curr_id+=1;


			return curr_id;
        }
        
        function initPlayerTwo(uint256 game_id) public payable
        {
            require(Games[game_id].currState == GameState.PlayerOnePaid,"Player One hasn't paid");
            Games[game_id].isPlayerTwoIn = true;
            Games[game_id].PlayerTwoAddress = payable(msg.sender);
            require(msg.value == Games[game_id].bet,"Wrong Deposit Amount");
            Games[game_id].currState = GameState.PlayerTwoPaid;
            emit GameStarted(game_id, Games[game_id].PlayerOneAddress,Games[game_id].PlayerTwoAddress);
		
        }
        
        
        
        function playerOneWithdraw(uint256 game_id) public payable
        {
            require(Games[game_id].currState == GameState.PlayerOnePaid,"Can't withdraw now, game has begun");
            require(msg.sender == Games[game_id].PlayerOneAddress,"This address can't withdraw");
            Games[game_id].PlayerOneAddress.transfer(Games[game_id].bet);
            Games[game_id].currState = GameState.COMPLETED;
        }
        
        
		
		
	   /**
        * Create a Chainlink request to retrieve API response, find the winner of the game
        * then make the payout to the correct player.
		* API function is in Moralis Cloud Functions
		* Replace the URL with your moralis server URL
       */
        function claimBounty(uint256 game_id,string calldata gid) public
        { 
		   
	       require(Games[game_id].currState == GameState.PlayerTwoPaid ,"Can't claim now");
		    bytes memory b;

	        // Set the URL to perform the GET request on
           Chainlink.Request memory request = buildChainlinkRequest(_jobId, address(this), this.fulfill.selector);
           string memory url ="https://z035e2qjftr3.usemoralis.com:2053/server/functions/ClaimBounty?_ApplicationId=qHsA9DI3q1ItxHmjHot32XxxctvFnxWgkyYqIjqy&gameid=";
		
		   b = abi.encodePacked(url, gid);  //Add query parameter gameid to url
           request.add("fetchUrl",string(b));
            
		   bytes32 requestId = sendChainlinkRequestTo(_oracle, request, fee);
           r_request[requestId] = game_id;
           

        }


    /**
     * Receive the response in the form of uint256
     */ 
    function fulfill(bytes32 _requestId, uint256 winner) public recordChainlinkFulfillment(_requestId)
    {
       uint256 game_id = r_request[_requestId];
	   if(winner == 0) //Player 1
	     playerOneWon(game_id);
	   if(winner == 1) //Players 2
	      playerTwoWon(game_id);
	   if(winner == 2) //Draw
	      releaseAllFunds(game_id);
	   
	   
	   
				  

	}
 		
        function playerOneWon(uint256 game_id) internal
        {
           
            Games[game_id].PlayerOneAddress.transfer( Games[game_id].bet*2);
            Games[game_id].currState = GameState.PAYOUT_MADE;
            emit GameWinner(game_id,Games[game_id].PlayerOneAddress,Games[game_id].bet*2);
        }
        
        function playerTwoWon(uint256 game_id) public payable
        {
            
            Games[game_id].PlayerTwoAddress.transfer( Games[game_id].bet*2 );
            Games[game_id].currState = GameState.PAYOUT_MADE;
            emit GameWinner(game_id,Games[game_id].PlayerTwoAddress,Games[game_id].bet*2);
        }
        
        function releaseAllFunds(uint256 game_id) public payable
        {
            Games[game_id].PlayerTwoAddress.transfer(Games[game_id].bet);
            Games[game_id].PlayerOneAddress.transfer(Games[game_id].bet);
			Games[game_id].currState = GameState.PAYOUT_MADE;
            
        }
        
		
		/**
     * Withdraw LINK from this contract
     * 
     * 
     * 
     */
    function withdrawLink() external onlyOwner
	{
	   LinkTokenInterface linkToken = LinkTokenInterface(chainlinkTokenAddress());
       require(linkToken.transfer(msg.sender, linkToken.balanceOf(address(this))), "Unable to transfer");
	

      }
    }