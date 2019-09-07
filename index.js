const { Transform } = require('stream')
const PRINTJ = require('printj')
const fs = require('fs')
const { createReadStream } = fs
const path = require('path')
const program = require('commander')
let infile
let outfile
program.version('0.0.1')
    .name('xxdez')
    .description('a very simple application that makes a hexdump.')
    .arguments('[infile [outfile]]')
    .option('-c <cols>', 'format <cols> octets per line. Default 16.', parseInt)
    .option('-ps <len>', 'output in postscript plain hexdump style for <len> octets perline.',parseInt)
    .option('-g <group>', 'number of octets per group in normal output. Default 2.', parseInt)
    .option('-i', 'output in C include file style.')
    .option('-j', 'output in JS array style.')
    .option('-l <len>', 'stop after <len> octets.', parseInt)
    .option('-o <off>', 'add <off> to the displayed file position.', parseInt)
    .action((i, o) => {
        infile = i
        outfile = o
        if (i) {
            const inpath = path.resolve(i)
            if (!fs.existsSync(inpath)) {
                console.log(`Error! ${infile} not found!`)
                process.exit(1)
            }
        }
    })
program.parse(process.argv)
let cols = 16
if (program.cols) {
    cols = program.cols
}
let Ps
if (program.Ps) {
    Ps = program.Ps
}
let C
if (program.C) {
    C = program.C
}
let I
if (program.I) {
    I = program.I
}
let J
if (program.J) {
    J = program.J
}
let L
if (program.L) {
    L = program.L
}
let O
if (program.O) {
    O = program.O
}
let G
if (program.G) {
    G = program.G
}
if (infile) {

} else {
    let temp = []
    let sum = 0
    if (O) {
        sum += O
    }
    const transform = Transform({
        transform(chunk, encoding, callback) {
            let arr = Array.from(chunk)
            if (arr.slice(-2)[0] === 0x0d) {
                arr.splice(-2, 1)
            }
            arr.reduce((s, v) => {
                s.push(v);
                return s;
            }, temp)
            while (temp.length > C) {
                const t = temp.slice(0, C)
                temp = temp.slice(C)
                let str = PRINTJ.sprintf("%08x", sum)
                str += ': '
                if (C < G) {
                    for (let j = 0; j < C; j++) {
                        str += PRINTJ.sprintf("%02x", t[j])
                    }
                } else {
                    const gr = Math.floor(C / G);
                    for (let i = 0; i < gr; i++) {
                        for (let j = 0; j < G; j++) {
                            str += PRINTJ.sprintf("%02x", t[gr * G + j])
                        }
                        str += ' '
                    }
                }
                str += ' '
                for (let i = 0; i < C; i++) {
                    if (t[i] < 0x20 || t[i] > 0x7e) {
                        str += '.'
                    } else {
                        str += String.fromCharCode(t[i])
                    }
                }
                console.log(str)
                sum += C
            }
            callback()
        }
    })
    process.stdin.pipe(transform).pipe(process.stdout)
}
// if (argv.length == 2) {
//     let temp = []
//     let sum = 0
//     const transform = Transform({
//         transform(chunk, encoding, callback) {
//             let arr = Array.from(chunk)
//             if (arr.slice(-2)[0] === 0x0d) {
//                 arr.splice(-2, 1)
//             }
//             arr.reduce((s, v) => {
//                 s.push(v);
//                 return s;
//             }, temp)
//             while (temp.length > 16) {
//                 const t = temp.slice(0, 16)
//                 temp = temp.slice(16)
//                 let str = PRINTJ.sprintf("%08x", sum)
//                 str += ': '
//                 for (let i = 0; i < 8; i++) {
//                     str += PRINTJ.sprintf("%02x%02x ", t[i * 2], t[i * 2 + 1])
//                 }
//                 str += ' '
//                 for (let i = 0; i < 16; i++) {
//                     if (t[i] < 0x20 || t[i] > 0x7e) {
//                         str += '.'
//                     } else {
//                         str += String.fromCharCode(t[i])
//                     }
//                 }
//                 console.log(str)
//                 sum += 16
//             }
//             callback()
//         }
//     })
//     process.stdin.pipe(transform).pipe(process.stdout)
// } else if (argv.length == 3) {
//     let temp = []
//     let sum = 0
//     const transform = Transform({
//         transform(chunk, encoding, callback) {
//             let arr = Array.from(chunk)
//             if (arr.slice(-2)[0] === 0x0d) {
//                 arr.splice(-2, 1)
//             }
//             arr.reduce((s, v) => {
//                 s.push(v);
//                 return s;
//             }, temp)
//             while (temp.length > 16) {
//                 const t = temp.slice(0, 16)
//                 temp = temp.slice(16)
//                 let str = PRINTJ.sprintf("%08x", sum)
//                 str += ': '
//                 for (let i = 0; i < 8; i++) {
//                     str += PRINTJ.sprintf("%02x%02x ", t[i * 2], t[i * 2 + 1])
//                 }
//                 str += ' '
//                 for (let i = 0; i < 16; i++) {
//                     if (t[i] < 0x20 || t[i] > 0x7e) {
//                         str += '.'
//                     } else {
//                         str += String.fromCharCode(t[i])
//                     }
//                 }
//                 console.log(str)
//                 sum += 16
//             }
//             let str = PRINTJ.sprintf("%08x", sum)
//             str += ': '
//             const m = Math.floor(temp.length / 2)
//             const n = temp.length % 2
//             for (let i = 0; i < m; i++) {
//                 str += PRINTJ.sprintf("%02x%02x ", temp[i * 2], temp[i * 2 + 1])
//             }
//             if (n) {
//                 str += PRINTJ.sprintf("%02x", temp[temp.length - 1])
//             }
//             str += ' '.repeat(42 - 6 * m) + (n ? '  ' : '') + ' '
//             for (let i = 0; i < temp.length; i++) {
//                 if (temp[i] < 0x20 || temp[i] > 0x7e) {
//                     str += '.'
//                 } else {
//                     str += String.fromCharCode(temp[i])
//                 }
//             }
//             console.log(str)
//             callback()
//         }
//     })
//     createReadStream(path.resolve(argv[2])).pipe(transform).pipe(process.stdout)

// } else {
//     console.log("")
// }
