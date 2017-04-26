# EthDeployer
A simple react app for automatically compiling &amp; deploying Solidity language Ethereum smart-contracts

###dependencies

(install nodejs and npm, latest versions if you can)

npm i -g ethereumjs-testrpc  # for testrpc localhost testing

npm i -g ethereumjs-util     # for testrpc localhost testing, see note below

npm i -g truffle             # a useful Solidity-language tool

Metamask browser plugin      # for auto-signing of contracts (manual private-key signing not enabled yet)

### How to install

git clone https://www.github.com/Tectract/EthDeployer

cd EthDeployer

npm i

npm start     # for testing mode

npm run build     # for live server hosting mode, use apache/httpd/nginx or similar routing tool for local path/URL customization

my lines in /etc/httpd/conf/httpd.conf (should be the same for /etc/apache2/sites-enabled/default.conf)

Alias /EthDeployer /home/ec2-user/EthDeployer/build

### How to Use

install metamask browser plugin (see https://metamask.io), and connect to either mainnet, or localhost:8545 (local tesrpc server)

make sure you can see accounts in metamask, and they should either be live accounts with real ether, or match your testrpc local testing accounts

'npm start' will tell you the local port number and try to open the browser to the test server hosted page

otherwise, 'npm run build', customize path via passenger/apache, and visit the page

copy/paste your solidity contract into the box and press 'Compile & Deploy', you will be prompted for gas payment via metamask plugin

if you are running testrpc on localhost:8545, you can turn metamask off, or connect it to localhost:8545 and it will prompt you for testnet gas payment! (see notes below)

Your Solidity language contract is now deployed on either testnet or Ethereum mainnet (if you paid real ether!)

links are displayed for the TXID and Contract address. You will need to WAIT about 30s for the next block, for the tx/address to appear, on mainnet

use the web console debugger tool for console messages and debugging, please submit updates/upgrades, bug reports, feature requests THROUGH THE GITHUB ISSUES TOOL FOR THIS REPO!


Useful tool info and examples for learning to write Ethereum smart-contracts, to accompany my BlockGeeks article

truffle commands:

truffle init

truffle compile

truffle migrate

truffle console

### testrpc startup with pre-set seed phrase and pre-defined networkID

COMMAND FROM DEMO ARTICLE: testrpc -m "sample dog come year spray crawl learn general detect silver jelly pilot" --network-id 20

important note!: networkID needs to be below decimal(108) for tx signature to work properly (tx.v must be one byte only)

important note!: ethereumjs-testrpc depends on OUTDATED ethereumjs-util, which has a signing bug which prevents Metamask from signing properly LOCALLY,

but it works ok on mainnet. In order to fix this for localhost testing, you can do this:

npm i -g ethereumjs-util@latest  # separately from ethereumjs-testrpc

now: you need to find where ethereumjs-testrpc and ethereumjs-util actually got installed, then go to the

cd path-to/ethereumjs-util/node_modules

mv ethereumjs-util ethereumjs-util_old

ln -s path-to/ethereumjs-util .

this symlink will TRICK ethereumjs-testrpc into using the latest version of ethereumjs-util, and solve the "signing bug" for local deployment
