import {
  TokenStream, Tokenizer
} from './tokenize/tokenizer'

(globalThis as any).gloom = await import('.')

const tokenizer = new Tokenizer(
// `
// func a() -> Func<(int), int> {
//   let b = if (a == 1_1_1_1_000_0.0_114514e4f64) {
//     return 0x0ff43a1
//   };
//   ;
//   return [
//     ('\\u{554a}', '\\u{8fd9}', '\n', '\t', '\\\'', '啊', '\\u8fd9'),
//     ("啊在\\u{554a}\\u{8fd9}\\n逸一时，误一世"),
//     (\`
// 逸一时,
// 误一世!
// 你是一个一个编程语言啊!
// \`),
//     (true, false true or false, true and false)
//   ]
// }
// `
`func printInt1(int n) int {
  println(n)
  return n
}
func printInt2(int n) int {
  println(n)
  n
}
func printInt3(int n) -> int {
  println(n)
  n
}

let n = printInt1(111)

// Func没有泛型时，不能有参数或返回值
let fn Func = func(){}

// 当Func仅有一个泛型参数时，该类型作为唯一参数类型，无返回值
let printInt Func<int> = func(int n){
  println(n)
}
printInt(88)

// 当Func仅有一组泛型参数时，该组类型作为参数类型，无返回值
let printTwoInt Func<(int,int)> = func(int n1,int n2){
  println([n1,n2])
}
printTwoInt(11,22);

let max Func<(int,int),int> = func(int n1,int n2) int {
  if(n1 > n2){
      n1
  }else{
      n2
  }
}

println(max(5,6))

// 传入两个int值，返回一个含有两个int的元组
let swapIntFn : Func<(int,int),(int,int)> = func(int n1,int n2) -> (int,int) {
  (n2,n1)
}

println(swapIntFn(7,8))


pub func arrayForEach(Array<int> array, Func<int> fn){
  for item in array {
      fn(item)
  }
}
arrayForEach([11,22,33,44], func(int n){ println(n) })
`
)

console.log(tokenizer)

console.log([...new TokenStream(tokenizer)])