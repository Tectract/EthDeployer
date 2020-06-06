import React, { Component } from 'react';
import './App.css';
import Web3 from 'web3';
import _ from 'lodash';

var web3 = {};
var alreadyLoaded = false;
var compiler;
var optimize = 1;
var ethAccounts = [];


function loadWeb3() {
   let web3Injected = window.web3;
   if(window.ethereum !== 'undefined') {
     window.ethereum.enable().then(function (accounts) {
       // You now have an array of accounts!
       // Currently only ever one:
       ethAccounts = accounts;
       //console.log("accounts : " + accounts)
       // ['0xFDEa65C8e26263F6d9A1B5de9555D2931A33b825']
     }).catch(function (error) {
       // Handle error. Likely the user rejected the login
       console.log("couldn't get accounts!");
     });
     if(typeof web3Injected !== 'undefined'){
       console.log("saw injected web3!");
       web3 = new Web3(web3Injected.currentProvider);

     } else {
       console.log("did not see web3 injected!");
       web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
       //console.debug(web3.eth.accounts);
     }
   } else {
     console.log("did not see metamask ethereum object injected!");
   }
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
      statusMessage: 'loading BrowserSolc compiler...',
      thisTxHash: '',
      thisAddress: '',
      compiler: {}
    };
    this.RegisterChange = this.RegisterChange.bind(this);
  }

  getInfo(){
    var outerThis = this;
    if(typeof web3.eth !== 'undefined'){
      console.log("saw eth accounts: ");
      console.debug(web3.eth.accounts);
      //console.debug(web3.eth)
      // web3.eth.getCompilers(function(err,resp){
      //   console.log("available compilers: " + resp);
      // });
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

  setupCompiler(){
    var outerThis = this;
    setTimeout(function(){
      // console.debug(window.BrowserSolc);
      window.BrowserSolc.getVersions(function(soljsonSources, soljsonReleases) {
        var compilerVersion = soljsonReleases[_.keys(soljsonReleases)[0]];
        console.log("Browser-solc compiler version : " + compilerVersion);
        window.BrowserSolc.loadVersion(compilerVersion, function(c) {
          compiler = c;
          outerThis.setState({statusMessage:"ready!"},function(){
            console.log("Solc Version Loaded: " + compilerVersion);
          });
        });
      });
    },1000);
  }

  compileAndDeploy() {
    var outerThis = this;
    console.log("compileAndDeploy called!");
    this.setState({
      statusMessage: "compiling and deploying!"
    });

    //console.debug(compiler);

    let jsonContractSource = JSON.stringify({
        language: 'Solidity',
        sources: {
          'Task': {
              content: this.state.contractText,
           },
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi',"evm.bytecode"]
                },
            },
        },
    });

    var result = compiler.compile(jsonContractSource);
    //var result = compiler.compile(this.state.contractText);

    console.log("saw result : " + result);
    console.debug(result);

    if(result.errors && JSON.stringify(result.errors).match(/error/i)){
      outerThis.setState({
        statusMessage: JSON.stringify(result.errors)
      });
    } else {
      console.debug(result.contracts);
      // we need to find which of the contracts contains the bytecode for deployment
      // thisContractSorted = _.sortBy _.map(result.contracts, function(val,key) {
      //   // ugly mapsort in react
      //     return [val['abi'],key];
      //   }
      // ), (val) ->
      //   return -1*parseFloat(val[0])  # this grabs the hidden timestampms from above, to sort by


      var thisMap = _.sortBy(_.map(result.contracts.Task, function(val,key) {
        // ugly mapsort in react
          return [key,val];
        }), function(val) {
          return -1*parseFloat(val[1].bytecode);
        });

      console.debug(thisMap);
      //var abi = JSON.parse(thisMap[0][1].abi);
      var abi = thisMap[0][1].abi;
      var bytecode = "0x" + thisMap[0][1].evm.bytecode.object;
      // var abi = result.contracts["Task"][0].abi
      // var bytecode = result.contracts["Task"][0].bytecode

      var myContract = web3.eth.contract(abi);
      console.log("bytecode: " + JSON.stringify(bytecode));
      console.log("abi: " + JSON.stringify(abi));
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
          web3.eth.estimateGas({data: bytecode},function(err,gasEstimate){
            if(err) {
              console.log("deployment web3.eth.estimateGas error: " + err);
              outerThis.setState({
                statusMessage: "deployment web3.eth.estimateGas error: " + err
              });
              return null;
            } else {
              console.log("deployment web3.eth.estimateGas amount: " + gasEstimate);
              var inflatedGasCost = Math.round(1.2*gasEstimate);
              var ethCost = gasPrice * inflatedGasCost / 10000000000 / 100000000;
              var warnings = ""
              if(result.errors){
                warnings = JSON.stringify(result.errors) + ", " // show warnings if they exist
              }
              outerThis.setState({
                statusMessage: warnings + "Compiled! (inflated) estimateGas amount: " + inflatedGasCost + " (" + ethCost+ " Ether)"
              });
              myContract.new({from:web3.eth.accounts[0],data:bytecode,gas:inflatedGasCost},function(err, newContract){
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
                    console.log(JSON.stringify(newContract));
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
    // this.setState({
    //   [e.target.name]: e.target.value,
    //   "statusMessage": "ready!"
    // }
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
      this.setupCompiler();
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
                <a href="https://www.enledger.io/" target="_blank"><img src="https://www.enledger.io/EnLedger_Logo_381_381.png" alt="EnLedger-Logo" width="80px"/></a><br />
                <a href="https://www.enledger.io/" target="_blank">EnLedger.io</a>
              </td>
              <td style={{"verticalAlign":"middle","textAlign":"center","fontSize":"12px","fontWeight":"bold"}}>
                &
              </td>
              <td style={{"width":"450px"}}>
                <a href="https://blockgeeks.com/" target="_blank"><img src="Blockgeeks-blue-black-white.png" alt="Blockgeeks-Logo" height="100px"/></a>
              </td>
              <td style={{"width":"20px","verticalAlign":"middle","textAlign":"center","fontSize":"12px","fontWeight":"bold"}}>
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
                 style={{"backgroundColor":"#E9FEED","resize":"none","overflowX":"hidden"}}
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
                  <span style={{"fontSize":"15px","fontWeight":"bold"}}>
                    Thank you for visiting <a href="https://www.enledger.io/" target="_blank">EnLedger.io</a> and <a href="https://www.github.com/Tectract/EthDeployer" target="_blank">Tectract&#39;s EthDeployer!</a><br /><br />
                  </span>
                </td></tr>
                <tr><td>
                  <span style={{"fontSize":"13px","fontWeight":"bold"}}>
                    To use this tool you&#39;ll need a connection to an Ethereum network, via:<br />
                    <span style={{"padding":"0px 0px 0px 6px"}}>
                      1. start <a href="https://github.com/ethereum/go-ethereum" target="_blank">Ethereum server</a> or <a href="https://github.com/ethereumjs/testrpc" target="_blank">testrpc server</a> running at localhost:8545, then reload this page
                    </span><br /><span style={{"padding":"0px 0px 0px 6px"}}>
                      2. Install <a href="https://metamask.io/" target="_blank">Metamask plugin</a>, connect to network of your choice (including Mainnet!), then reload this page
                    </span><br />
                    <u>notes</u>: for localhost testrpc (testnet), you don&#39;t need Metamask running, see <a href="https://github.com/Tectract/EthDeployer/blob/master/README.md" target="_blank">the README</a> for metamask signing locally & ethereumjs-testrpc notes<br />
                    <u>notes</u>: for compilation to succeed while running against localhost:8545 you&#39;ll need solc (solidity compiler) installed locally, see instructions <a href="https://solidity.readthedocs.io/en/v0.3.3/installing-solidity.html" target="_blank">here</a><br />
                    <u>notes</u>: sometimes you may need to reload once or twice for it to see your web3.eth.accounts[0] account
                    <br /><br />
                    Author: <a href="https://www.tectractys.com/u/Tectract" target="_blank">Ryan Molecke</a>, sponsored by <a href="http://blockgeeks.com/" target="_blank">BlockGeeks.com</a>!<br />
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
