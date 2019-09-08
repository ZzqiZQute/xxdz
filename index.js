const { Transform } = require('stream')
const PRINTJ = require('printj')
const fs = require('fs')
const { createReadStream } = fs
const path = require('path')
const program = require('commander')
let infile
let outfile
program.version('0.0.1')
    .name('xxdz')
    .description('a very simple application that makes a hexdump.')
    .arguments('[infile [outfile]]')
    .option('-c <cols>', 'format <cols> octets per line. Default 16 (-i 12, -j 12, -ps 30).', parseInt)
    .option('-p', 'output in postscript plain hexdump style octets perline.')
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
                console.log(`xxdez: ${infile}: No such file`)
                process.exit(1)
            }
        }
    })
program.parse(process.argv)

let P
if (program.P) {
    P = program.P
}

let I
if (program.I) {
    I = program.I
}
let J
if (program.J) {
    J = program.J
}
if (I && J) {
    console.log("Cannot output C and JS format code at the same time!")
    process.exit(1)
}
let L
if (program.L) {
    L = program.L
}
let O
if (program.O) {
    O = program.O
}
let G = 2
let gFlag = false
if (program.G) {
    G = program.G
    gFlag = true
}
let C = 16
if (I || J) {
    C = 12
} else if (P) {
    C = 30
}
if (program.C) {
    C = program.C
}
if (infile) {
    if (outfile) {
        const outpath = path.resolve(outfile)
    } else {

    }

} else {
    let temp = []
    let readLen = 0
    let sum = 0
    let offset = 0
    if (O) {
        offset += O
    }
    if (I || J) {
        //In console ,they are the same
        if (P) {
            console.warn('warning, option -p is ignored')

        }
        if (O) {
            console.warn('warning, option -o is ignored')
        }
        if (gFlag) {
            console.warn('warning, option -g is ignored')
        }

        let temp = []
        const transform = Transform({
            transform(chunk, encoding, callback) {
                let arr = Array.from(chunk)
                if (arr.slice(-2)[0] === 0x0d) {
                    arr.splice(-2, 1)
                }
                temp = arr.reduce((s, v) => {
                    if (!L || L && readLen < L)
                        s.push(v)
                    readLen++
                    return s
                }, temp)
                if (L) {
                    while (temp.length > C) {
                        let tmp = temp.slice(0, C)
                        temp = temp.slice(C)
                        const str = tmp.reduce((s, v) => {
                            s += PRINTJ.sprintf("0x%02x, ", v)
                            return s
                        }, '')
                        console.log(str)
                    }
                    let str = temp.reduce((s, v) => {
                        s += PRINTJ.sprintf("0x%02x, ", v)
                        return s
                    }, '')
                    str=str.slice(0,-2)
                    console.log(str)
                    if (readLen >= L) {
                        process.exit(0)
                    } else {
                        temp = []
                    }
                } else {
                    while (temp.length > C) {
                        let tmp = temp.slice(0, C)
                        temp = temp.slice(C)
                        const str = tmp.reduce((s, v) => {
                            s += PRINTJ.sprintf("0x%02x, ", v)
                            return s
                        }, '')
                        console.log(str)
                    }
                    let str = temp.reduce((s, v) => {
                        s += PRINTJ.sprintf("0x%02x, ", v)
                        return s
                    }, '')
                    temp = []
                    str=str.slice(0,-2)
                    console.log(str)
                }
                callback()
            }
        })
        process.stdin.pipe(transform).pipe(process.stdout)
    }
    else if (P) {
        if (O) {
            console.warn('warning, option -o is ignored')
        }
        if (gFlag) {
            console.warn('warning, option -g is ignored')
        }
        let temp = []
        const transform = Transform({
            transform(chunk, encoding, callback) {
                let arr = Array.from(chunk)
                if (arr.slice(-2)[0] === 0x0d) {
                    arr.splice(-2, 1)
                }
                temp = arr.reduce((s, v) => {
                    if (!L || L && readLen < L)
                        s.push(v)
                    readLen++
                    return s
                }, temp)
                if (L) {
                    while (temp.length >= C) {
                        let tmp = temp.slice(0, C)
                        temp = temp.slice(C)
                        const str = tmp.reduce((s, v) => {
                            s += PRINTJ.sprintf("%02x", v)
                            return s
                        }, '')
                        console.log(str)
                    }
                    const str = temp.reduce((s, v) => {
                        s += PRINTJ.sprintf("%02x", v)
                        return s
                    }, '')
                    console.log(str)
                    if (readLen >= L) {
                        process.exit(0)
                    } else {
                        temp = []
                    }
                } else {
                    while (temp.length >= C) {
                        let tmp = temp.slice(0, C)
                        temp = temp.slice(C)
                        const str = tmp.reduce((s, v) => {
                            s += PRINTJ.sprintf("%02x", v)
                            return s
                        }, '')
                        console.log(str)
                    }
                    const str = temp.reduce((s, v) => {
                        s += PRINTJ.sprintf("%02x", v)
                        return s
                    }, '')
                    temp = []
                    console.log(str)
                }
                callback()
            }
        })
        process.stdin.pipe(transform).pipe(process.stdout)
    } else {
        const transform = Transform({
            transform(chunk, encoding, callback) {
                let arr = Array.from(chunk)
                if (arr.slice(-2)[0] === 0x0d) {
                    arr.splice(-2, 1)
                }
                arr.reduce((s, v) => {
                    if (!L || L && readLen < L)
                        s.push(v)
                    readLen++
                    return s
                }, temp)
                while (true) {
                    flag = false
                    if (L) {
                        if (sum + temp.length >= L) {
                            if (temp.length < C) {
                                flag = true
                            }
                        }
                        else if (temp.length < C) {
                            break
                        }
                    } else {
                        if (temp.length < C) {
                            break
                        }
                    }
                    if (flag) {
                        const t = temp
                        let str = PRINTJ.sprintf("%08x", offset + sum)
                        str += ': '
                        if (C < G) {
                            for (let j = 0; j < C; j++) {
                                str += PRINTJ.sprintf("%02x", t[j])
                            }
                        } else {
                            const gr = Math.floor(C / G)
                            for (let i = 0; i < gr; i++) {
                                for (let j = 0; j < G; j++) {
                                    if (i * G + j < t.length)
                                        str += PRINTJ.sprintf("%02x", t[i * G + j])
                                    else
                                        str += '  '
                                }
                                str += ' '
                            }
                            for (let i = gr * G; i < C; i++) {
                                if (i < t.length)
                                    str += PRINTJ.sprintf("%02x", t[i])
                                else
                                    str += '  '
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
                        process.exit(0)
                    } else {
                        const t = temp.slice(0, C)
                        temp = temp.slice(C)
                        let str = PRINTJ.sprintf("%08x", offset + sum)
                        str += ': '
                        if (C < G) {
                            for (let j = 0; j < C; j++) {
                                str += PRINTJ.sprintf("%02x", t[j])
                            }
                        } else {
                            const gr = Math.floor(C / G)
                            for (let i = 0; i < gr; i++) {
                                for (let j = 0; j < G; j++) {
                                    str += PRINTJ.sprintf("%02x", t[i * G + j])
                                }
                                str += ' '
                            }
                            for (let i = gr * G; i < C; i++) {
                                str += PRINTJ.sprintf("%02x", t[i])
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
                    if (temp.length <= 0) {
                        break
                    }
                }
                callback()
            }
        })
        process.stdin.pipe(transform).pipe(process.stdout)
    }
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
