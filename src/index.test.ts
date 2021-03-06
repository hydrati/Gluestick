import {
  TokenStream, Tokenizer
} from './tokenize/tokenizer'

(globalThis as any).gloom = await import('.')

const tokenizer = new Tokenizer(
`
import {
  "./hello.gs" as hello
  // more import
}


import "./hello.gs"
import "./hello.gs" as hello 

import {
  "std/module" as module
  "std/reflect" as reflect
}


let a : module.Module = import ("./hello.gs")

let sayHello : reflect.Value = a.searchByName("sayHello")

sayHello.call<(String)>("Tom") // print "Hello, Tom!"
`
)

console.log(tokenizer)

console.log([...new TokenStream(tokenizer)])
