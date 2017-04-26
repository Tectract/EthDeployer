import React, { Component } from 'react';
import './App.css';
import Web3 from 'web3';
import _ from 'lodash';

//var GeektABI = [{"constant":true,"inputs":[],"name":"getUsers","outputs":[{"name":"","type":"address[]"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"getImages","outputs":[{"name":"","type":"bytes32[]"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"handle","type":"string"},{"name":"city","type":"bytes32"},{"name":"state","type":"bytes32"},{"name":"country","type":"bytes32"}],"name":"registerNewUser","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"SHA256notaryHash","type":"bytes32"}],"name":"getImage","outputs":[{"name":"","type":"string"},{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"userAddress","type":"address"}],"name":"getUser","outputs":[{"name":"","type":"string"},{"name":"","type":"bytes32"},{"name":"","type":"bytes32"},{"name":"","type":"bytes32"},{"name":"","type":"bytes32[]"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"imageURL","type":"string"},{"name":"SHA256notaryHash","type":"bytes32"}],"name":"addImageToUser","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"searchCity","type":"bytes32"}],"name":"findUsersByCity","outputs":[{"name":"","type":"address[]"}],"payable":false,"type":"function"}];
//var GeektAddress = '0xe70ff0fa937a25d5dd4172318fa1593baba5a027';
//var GeektContract = {};
//var GeektContract = 'pragma solidity ^0.4.4; contract Geekt {mapping ( bytes32 => notarizedImage) notarizedImages; bytes32[] imagesByNotaryHash; mapping ( address => User ) Users; address[] usersByAddress; struct notarizedImage { string imageURL; uint timeStamp; } struct User { string handle; bytes32 city; bytes32 state; bytes32 country; bytes32[] myImages; } function registerNewUser(string handle, bytes32 city, bytes32 state, bytes32 country) returns (bool success) { address thisNewAddress = msg.sender; if(bytes(Users[msg.sender].handle).length == 0 && bytes(handle).length != 0){ Users[thisNewAddress].handle = handle; Users[thisNewAddress].city = city; Users[thisNewAddress].state = state; Users[thisNewAddress].country = country; return true; } else { return false; } } function addImageToUser(string imageURL, bytes32 SHA256notaryHash) returns (bool success) { address thisNewAddress = msg.sender; if(bytes(Users[thisNewAddress].handle).length != 0){ if(bytes(imageURL).length != 0 && SHA256notaryHash != bytes32(0x0)) { notarizedImages[SHA256notaryHash].imageURL = imageURL; notarizedImages[SHA256notaryHash].timeStamp = block.timestamp; Users[thisNewAddress].myImages.push(SHA256notaryHash); imagesByNotaryHash.push(SHA256notaryHash); return true; } else { return false;  } } else { return false; } } function getUsers() constant returns (address[]) { return usersByAddress; }  function getUser(address userAddress) constant returns (string,bytes32,bytes32,bytes32,bytes32[]) { return (Users[userAddress].handle,Users[userAddress].city,Users[userAddress].state,Users[userAddress].country,Users[userAddress].myImages); } function getImages() constant returns (bytes32[]) { return imagesByNotaryHash; } function getImage(bytes32 SHA256notaryHash) constant returns (string,uint) { return (notarizedImages[SHA256notaryHash].imageURL,notarizedImages[SHA256notaryHash].timeStamp); } function findUsersByCity(bytes32 searchCity) constant returns (address[]) { uint howManyUsersInThisCity = 0; uint length = usersByAddress.length; for(uint8 i=0; i < length; i++) { if(sha3(Users[usersByAddress[i]].city) == sha3(searchCity)) { howManyUsersInThisCity = howManyUsersInThisCity + 1; } } address[] memory tempAddressArray = new address[](howManyUsersInThisCity); howManyUsersInThisCity = 0; for(uint8 j=0; j < length; j++) { if(sha3(Users[usersByAddress[j]].city) == sha3(searchCity)) { tempAddressArray[howManyUsersInThisCity] = usersByAddress[j]; howManyUsersInThisCity = howManyUsersInThisCity + 1; } } return tempAddressArray; } }';
var web3 = {};
var alreadyLoaded = false;

function loadWeb3() {
   let web3Injected = window.web3;
   if(typeof web3Injected !== 'undefined'){
     console.log("saw injected web3!");
     web3 = new Web3(web3Injected.currentProvider);
   } else {
     console.log("did not see web3 injected!");
     web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
     //console.debug(web3.eth.accounts);
   }
   //GeektContract = web3.eth.contract(GeektABI).at(GeektAddress);
}

class Deploy extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      users: {},
      thisUser: {},
      thisImage: {},
      newFlag: 0,
      thisNetId: '',
      contractText: '',
      statusMessage: 'ready!',
      thisTxHash: '',
      thisAddress: ''
    };
    this.RegisterChange = this.RegisterChange.bind(this);
  }

  getInfo(){
    var outerThis = this;
    if(typeof web3.eth !== 'undefined'){
      console.log("saw eth accounts: ");
      console.debug(web3.eth.accounts);
      //console.debug(web3.eth)
      web3.eth.getCompilers(function(err,resp){
        console.log("available compilers: " + resp);
      });
      web3.version.getNetwork((err, netId) => {
        var tempNetId = ''
        if(err) {
          tempNetId = err;
          console.log('web3.version.getNetwork() saw err: ' + err);
        }
        console.log("saw netId:" + netId);
        switch (netId) {
          case "1":
            tempNetId = "mainnet";
            console.log('This is mainnet');
            break
          case "2":
            tempNetId = "Morden  test network";
            console.log('This is the deprecated Morden test network.');
            break
          case "3":
            tempNetId = "ropsten test network";
            console.log('This is the ropsten test network.');
            break
          default:
            tempNetId = "localhost";
            console.log('This is an unknown/localhost network: ' + tempNetId);
        }
        outerThis.setState({
          thisNetId: tempNetId
        });
      });
    }
  }

  compileAndDeploy() {
    var outerThis = this;
    console.log("compileAndDeploy called!");
    this.setState({
      statusMessage: "compiling and deploying!"
    });
    var parsedContract = this.state.contractText.split("\n");
    var length = parsedContract.length;
    for(var i = 0; i<length; i++){ // only smart enough to strip trailing comments in "//" format, "/* */" format comments not yet supported
      var removedComments = parsedContract[i].split("//")[0].trim();
      parsedContract[i]=removedComments;
    }
    //console.log("parsedContract: " + parsedContract);
    var formattedContract = ''
    for(var j = 0; j<length; j++){
      formattedContract = formattedContract + parsedContract[j];
    }
    //console.log("formattedContract: " + formattedContract);

    web3.eth.compile.solidity(formattedContract,function(err, resp){
      if(err) {
        console.log("compile err: " + err);
        outerThis.setState({
          statusMessage: "compile err: " + err
        });
        return null;
      } else {
        var thisResp = '';
        var code = '';
        var abi = '';
        console.debug(resp);
        if(!!resp["<stdin>:Geekt"]){
          thisResp = resp["<stdin>:Geekt"];  // just resp for testnet?
        } else {
          thisResp = resp;
        }
        code = thisResp.code;
        abi = thisResp.info.abiDefinition;
        var myContract = web3.eth.contract(abi);
        console.log("code: " + code);
        console.log("abi: " + abi);
        console.log("myContract: ");
        console.debug(myContract);
        //console.log("myAddress: " + web3.eth.accounts[0]);
        web3.eth.getGasPrice((err,gasPrice) => {
          if(err){
            console.log("deployment web3.eth.getGasPrice error: " + err);
            outerThis.setState({
              statusMessage: "deployment web3.eth.getGasPrice error: " + err
            });
            return null;
          } else {
            console.log("current gasPrice (gas / ether): " + gasPrice);
            web3.eth.estimateGas({data: code},function(err,gasEstimate){
              if(err) {
                console.log("deployment web3.eth.estimateGas error: " + err);
                outerThis.setState({
                  statusMessage: "deployment web3.eth.estimateGas error: " + err
                });
                return null;
              } else {
                console.log("deployment web3.eth.estimateGas amount: " + gasEstimate);
                var ethCost = gasPrice * gasEstimate / 10000000000 / 100000000;
                outerThis.setState({
                  statusMessage: "Compiled! estimateGas amount: " + gasEstimate + " (" + ethCost+ " Ether)"
                });
                myContract.new({from:web3.eth.accounts[0],data:code,gas:gasEstimate},function(err, newContract){
                  console.log("newContract: " + newContract);
                  if(err) {
                    console.log("deployment err: " + err);
                    outerThis.setState({
                      statusMessage: "deployment error: " + err
                    });
                    return null;
                  } else {
                    // NOTE: The callback will fire twice!
                    // Once the contract has the transactionHash property set and once its deployed on an address.
                    // e.g. check tx hash on the first call (transaction send)
                    if(!newContract.address) {
                      console.log("Contract transaction send: TransactionHash: " + newContract.transactionHash + " waiting to be mined...");
                      outerThis.setState({
                        statusMessage: "Please wait a minute.",
                        thisTxHash: newContract.transactionHash,
                        thisAddress: "waiting to be mined..."
                      });
                    } else {
                      console.log("Contract mined! Address: " + newContract.address);
                      console.log(newContract);
                      var thisNewStatus = "Contract Deployed to " + outerThis.state.thisNetId;
                      outerThis.setState({
                        statusMessage: thisNewStatus,
                        thisAddress: newContract.address
                      });
                      return null;
                    }
                  }
                });
              }
            });
          }
        });
      }
    });
    return null;
  }

  txHashLink(thisTxHash){
    var thisLink = "https://etherscan.io/tx/" + thisTxHash;
    return <a href={ thisLink } target='_blank'>{ thisTxHash }</a>;
  }

  ethAddressLink(thisAddress){
    var thisLink = "https://etherscan.io/address/" + thisAddress;
    return <a href={ thisLink } target="_blank">{ thisAddress }</a>;
  }

  RegisterChange(e) {
    //console.log('registering change : ' + e.target.name + " - " + e.target.value);
    var newState = this.state;
    newState[e.target.name] = e.target.value;
    newState["statusMessage"] = "ready!";
    this.setState(newState);
  }

  defaultEthAddressLink() {
    if(typeof web3.eth !== 'undefined'){
      if(typeof web3.eth.accounts !== 'undefined') {
        if(typeof web3.eth.accounts[0] !== 'undefined'){
          var thisLink = "https://etherscan.io/address/" + web3.eth.accounts[0];
          return <span><a href={ thisLink }target="_blank">{ web3.eth.accounts[0] }</a></span>
        } else {
          return <span> web3.eth.accounts[0] was undefined!</span>
        }
      } else {
        return <span> web3.eth.accounts was undefined!</span>
      }
    } else {
      return <span> web3.eth was undefined!</span>
    }
  }

  componentDidMount() {
    if(!alreadyLoaded){ // we only want this to happen once upon page load, not every component reload...
      alreadyLoaded = true;
      loadWeb3();
      this.getInfo();
    }
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <table style={{"minWidth":"70%","textAlign":"center","margin":"auto"}}>
            <tbody>
              <tr>
              <td style={{"width":"170px"}}>
                <a href="http://www.soles.io/" target="_blank"><img src="http://www.soles.io/new_glowy_logo.png" alt="SOLES-Logo" width="160px"/></a><br />
                <a href="http://www.soles.io/" target="_blank">SOLES.io</a>
              </td>
              <td style={{"verticalAlign":"middle","textAlign":"center","font-size":"12px","font-weight":"bold"}}>
                &
              </td>
              <td style={{"width":"450px"}}>
                <a href="https://blockgeeks.com/" target="_blank"><img src="Blockgeeks-blue-black-white.png" alt="Blockgeeks-Logo" height="100px"/></a>
              </td>
              <td style={{"width":"20px","verticalAlign":"middle","textAlign":"center","font-size":"12px","font-weight":"bold"}}>
                present
              </td><td>
                <h2><span style={{"color":"#84DDFF"}}><a href="https://www.github.com/Tectract" style={{"color":"#84DDFF"}} target="_blank">Tectract&#39;s</a></span></h2>
                <h1><b><a href="https://www.github.com/Tectract/EthDeployer" style={{"color":"#FFFFFF"}} target="_blank">EthDeployer</a></b></h1>
              </td></tr>
            </tbody>
          </table>
        </div><br />
        <div className="App-intro">
          <div>Saw connection to network: <b>{ this.state.thisNetId }</b>!</div><br />
          <div>Saw default Eth account to use: <b>{ this.defaultEthAddressLink() }</b>!</div><br />

          <textarea
                 rows='18' cols='120'
                 className="contractText"
                 name='contractText'
                 ref='contractTextRef'
                 style={{"backgroundColor":"#E9FEED","whiteSpace":"nowrap","resize":"none","overflowX":"hidden"}}
                 value={this.state.contractText}
                 onChange={this.RegisterChange} />
          <br /><br />{ this.state.statusMessage }<br /><br />
          <button color="white" className="Button" onClick={ () => { this.compileAndDeploy() } }>Compile & Deploy</button>
          <br /><br />


          <div>new contract TXID: { this.txHashLink(this.state.thisTxHash) }</div>
          <div>new contract address: { this.ethAddressLink(this.state.thisAddress) }</div>

          <br />
          <br />
          <hr />
          <span className="app-outro">
            <table style={{"minWidth":"70%","textAlign":"left","margin":"auto"}}>
              <tbody>
                <tr><td style={{"textAlign":"center"}}>
                  <span style={{"font-size":"15px","font-weight":"bold"}}>
                    Thank you for visiting <a href="http://www.soles.io/" target="_blank">SOLES.io</a> and <a href="https://www.github.com/Tectract/EthDeployer" target="_blank">Tectract&#39;s EthDeployer!</a><br /><br />
                  </span>
                </td></tr>
                <tr><td>
                  <span style={{"font-size":"13px","font-weight":"bold"}}>
                    To use tool you&#39;ll need a connection to an Ethereum network, via:<br />
                    <span style={{"padding":"0px 0px 0px 6px"}}>
                      1. start <a href="https://github.com/ethereum/go-ethereum" target="_blank">Ethereum server</a> or <a href="https://github.com/ethereumjs/testrpc" target="_blank">testrpc server</a> running at localhost:8545, then reload this page
                    </span><br /><span style={{"padding":"0px 0px 0px 6px"}}>
                      2. Install <a href="https://metamask.io/" target="_blank">Metamask plugin</a>, connect to network of your choice (including Mainnet!), then reload this page
                    </span><br />
                    <u>notes</u>: for localhost testrpc (testnet), you don&#39;t need Metamask running, see <a href="https://github.com/Tectract/EthDeployer/blob/master/README.md" target="_blank">the README</a> for metamask signing locally & ethereumjs-testrc notes
                    <br /><br />
                    Author: <a href="http://www.soles.io/blog/our-team/" target="_blank">Ryan Molecke</a>, sponsored by <a href="http://blockgeeks.com/" target="_blank">BlockGeeks.com</a>!<br />
                    Issues, comments, suggestions? Please use <a href="https://github.com/Tectract/EthDeployer/issues" target="_blank">this page</a> to start an issue ticket, do not email Ryan for help directly :)<br />
                    If you clone this tool and set up your own EthDeployer, please include the <a href="https://github.com/Tectract/EthDeployer/blob/master/LICENSE" target="_blank">Mozilla Public License 2.0</a> & give me props, thanks! ~Ryan

                  </span>
                </td></tr>
              </tbody>
            </table>
          </span>
          <br /><br />
        </div>
      </div>
    );
  }
}

export default Deploy;