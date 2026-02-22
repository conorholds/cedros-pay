"use strict";var u=Object.create;var s=Object.defineProperty;var c=Object.getOwnPropertyDescriptor;var p=Object.getOwnPropertyNames;var y=Object.getPrototypeOf,d=Object.prototype.hasOwnProperty;var b=(a,e,l,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let t of p(e))!d.call(a,t)&&t!==l&&s(a,t,{get:()=>e[t],enumerable:!(o=c(e,t))||o.enumerable});return a};var f=(a,e,l)=>(l=a!=null?u(y(a)):{},b(e||!a||!a.__esModule?s(l,"default",{value:a,enumerable:!0}):l,a));Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});let n=!1,r=!1;async function h(){if(n)return r?{available:!0}:{available:!1,error:i()};try{return await import("@solana/web3.js"),n=!0,r=!0,{available:!0}}catch{return n=!0,r=!1,{available:!1,error:i()}}}function i(){return`Solana dependencies not installed. To use crypto payments, install them with:

npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base

Or if you only need Stripe payments, hide the crypto button with:
<CedrosPay showCrypto={false} />`}exports.checkSolanaAvailability=h;
