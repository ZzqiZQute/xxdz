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
    .option('-s <seek>', 'start at <seek> bytes', parseInt)
    .option('-u', 'use uppercase to show.')
    .action((i, o) => {
        infile = i
        outfile = o
        if (i) {
            const inpath = path.resolve(i)
            if (!fs.existsSync(inpath)) {
                console.error(`xxdz: ${infile}: No such file`)
                process.exit(1)
            }
            else {
                const fd = fs.openSync(inpath)
                if (fs.fstatSync(fd).isDirectory()) {
                    console.error(`xxdz: ${infile}: Is a directory`)
                    fs.closeSync(fd)
                    process.exit(1)
                }
                fs.closeSync(fd)

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
    console.error("xxdz: Cannot output C and JS format code at the same time")
    process.exit(1)
}
let L
if (program.L !== undefined) {
    L = program.L
}
if (L !== undefined && L <= 0) {
    console.error("xxdz: Length must be greater than 0")
    process.exit(1)
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
let U
if (program.U) {
    U = program.U
}
let S = 0
if (program.S) {
    S = program.S
}
if (S < 0 && !infile) {
    console.error('xxdz: Cannot seek minus bytes in the console.')
    process.exit(1)
}
const printf = (U, format, ...args) => {
    return PRINTJ.sprintf(U ? format.toUpperCase() : format, args)
}
if (infile) {
    let outFlag = false
    if (outfile) {
        const outpath = path.resolve(outfile)
        if (fs.existsSync(outpath)) {
            if (fs.statSync(outpath).isDirectory()) {
                console.error(`xxdz: ${outpath}: Is a directory`)
                process.exit(1)
            }
        }
        outFlag = true
    }
    let temp = []
    let readLen = 0
    let readLen2 = 0
    let sum = 0
    let offset = 0
    if (O) {
        offset += O
    }
    const fd = fs.openSync(path.resolve(infile))
    const size = fs.fstatSync(fd).size
    if (S < 0) {
        const tempS = S
        S += size
        if (S < 0) {
            fs.closeSync(fd)
            console.error(`xxdz: Cannot seek before the head, size = ${size}, seek = ${tempS}`)
            process.exit(1)
        }
    }
    else if (S >= size) {
        fs.closeSync(fd)
        process.exit(0)
    }
    fs.closeSync(fd)
    if (I || J) {
        if (P) {
            console.warn('warning, option -p is ignored')
            console.log()
        }
        if (O) {
            console.warn('warning, option -o is ignored')
            console.log()
        }
        if (gFlag) {
            console.warn('warning, option -g is ignored')
            console.log()
        }
        let temp = []
        let endFlag = false
        if (I) {
            const transform = new Transform({
                transform(chunk, encoding, callback) {
                    if (readLen + chunk.length < S) {
                        readLen += chunk.length
                        callback()
                        return
                    }
                    let arr = Array.from(chunk)
                    temp = arr.reduce((s, v) => {
                        if ((L === undefined || L !== undefined && readLen2 < L) && (!S || S && readLen >= S)) {
                            s.push(v)
                            readLen2++
                        }
                        readLen++
                        return s
                    }, temp)
                    if (L) {
                        while (temp.length > C) {
                            let tmp = temp.slice(0, C)
                            temp = temp.slice(C)
                            const str = '  ' + tmp.reduce((s, v) => {
                                s += printf(U, "0x%02x, ", v)
                                return s
                            }, '')
                            this.push(str + '\n')
                        }
                        let str = '  ' + temp.reduce((s, v) => {
                            s += printf(U, "0x%02x, ", v)
                            return s
                        }, '')
                        str = str.slice(0, -2)
                        this.push(str + '\n')
                        if (readLen >= L) {
                            transform.push(`};\nunsigned int ${path.basename(path.resolve(infile)).replace(/\W/g, '_')}_len = ${readLen2};\n`)
                            transform.destroy();
                            endFlag = true
                        } else {
                            temp = []
                        }
                    } else {
                        while (temp.length > C) {
                            let tmp = temp.slice(0, C)
                            temp = temp.slice(C)
                            const str = '  ' + tmp.reduce((s, v) => {
                                s += printf(U, "0x%02x, ", v)
                                return s
                            }, '')
                            this.push(str + '\n')
                        }
                        let str = '  ' + temp.reduce((s, v) => {
                            s += printf(U, "0x%02x, ", v)
                            return s
                        }, '')
                        temp = []
                        str = str.slice(0, -2)
                        this.push(str + '\n')
                    }
                    callback()

                }
            })
            const rs = createReadStream(path.resolve(infile));
            transform.on('pipe', () => {
                transform.push(`unsigned char ${path.basename(path.resolve(infile)).replace(/\W/g, '_')}[] = {\n`)
            })
            rs.on('end', () => {
                if (!endFlag) {
                    transform.push(`};\nunsigned int ${path.basename(path.resolve(infile)).replace(/\W/g, '_')}_len = ${size - S};\n`)
                    transform.destroy()
                }
            })
            if (!outFlag)
                rs.pipe(transform).pipe(process.stdout)
            else
                rs.pipe(transform).pipe(fs.createWriteStream(path.resolve(outfile)))
        }
        else {
            const transform = new Transform({
                transform(chunk, encoding, callback) {
                    if (readLen + chunk.length < S) {
                        readLen += chunk.length
                        callback()
                        return
                    }
                    let arr = Array.from(chunk)
                    temp = arr.reduce((s, v) => {
                        if ((L === undefined || L !== undefined && readLen2 < L) && (!S || S && readLen >= S)) {
                            s.push(v)
                            readLen2++
                        }
                        readLen++
                        return s
                    }, temp)
                    if (L) {
                        while (temp.length > C) {
                            let tmp = temp.slice(0, C)
                            temp = temp.slice(C)
                            const str = '  ' + tmp.reduce((s, v) => {
                                s += printf(U, "0x%02x, ", v)
                                return s
                            }, '')
                            this.push(str + '\n')
                        }
                        let str = '  ' + temp.reduce((s, v) => {
                            s += printf(U, "0x%02x, ", v)
                            return s
                        }, '')
                        str = str.slice(0, -2)
                        this.push(str + '\n')
                        if (readLen >= L) {
                            endFlag = true
                            transform.push(`];\n\/\/Hint: You can use [Array.length] method to get the length\nconst ${infile.replace(/\W/g, '_')}_len = ${readLen2};\n`)
                            transform.destroy();
                        } else {
                            temp = []
                        }
                    } else {
                        while (temp.length > C) {
                            let tmp = temp.slice(0, C)
                            temp = temp.slice(C)
                            const str = '  ' + tmp.reduce((s, v) => {
                                s += printf(U, "0x%02x, ", v)
                                return s
                            }, '')
                            this.push(str + '\n')
                        }
                        let str = '  ' + temp.reduce((s, v) => {
                            s += printf(U, "0x%02x, ", v)
                            return s
                        }, '')
                        temp = []
                        str = str.slice(0, -2)
                        this.push(str + '\n')
                    }
                    callback()

                }
            })
            const rs = createReadStream(path.resolve(infile));
            transform.on('pipe', () => {
                transform.push(`const ${path.basename(path.resolve(infile)).replace(/\W/g, '_')} = [\n`)
            })
            rs.on('end', () => {
                if (!endFlag) {
                    transform.push(`];\n\/\/Hint: You can use [Array.length] method to get the length\nconst ${path.basename(path.resolve(infile)).replace(/\W/g, '_')}_len = ${readLen2};\n`)
                    transform.destroy();
                }
            })
            if (!outFlag)
                rs.pipe(transform).pipe(process.stdout)
            else
                rs.pipe(transform).pipe(fs.createWriteStream(path.resolve(outfile)))
        }
    } else if (P) {
        if (O) {
            console.warn('warning, option -o is ignored')
            console.log()
        }
        if (gFlag) {
            console.warn('warning, option -g is ignored')
            console.log()
        }
        let temp = []
        const transform = new Transform({
            transform(chunk, encoding, callback) {
                if (readLen + chunk.length < S) {
                    readLen += chunk.length
                    callback()
                    return
                }
                let arr = Array.from(chunk)
                temp = arr.reduce((s, v) => {
                    if ((L === undefined || L !== undefined && readLen2 < L) && (!S || S && readLen >= S)) {
                        s.push(v)
                        readLen2++
                    }
                    readLen++
                    return s
                }, temp)
                if (L) {
                    while (temp.length >= C) {
                        let tmp = temp.slice(0, C)
                        temp = temp.slice(C)
                        const str = tmp.reduce((s, v) => {
                            s += printf(U, "%02x", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    if (temp.length > 0) {
                        const str = temp.reduce((s, v) => {
                            s += printf(U, "%02x", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    if (readLen >= L) {
                        this.destroy()
                    } else {
                        temp = []
                    }
                } else {
                    while (temp.length >= C) {
                        let tmp = temp.slice(0, C)
                        temp = temp.slice(C)
                        const str = tmp.reduce((s, v) => {
                            s += printf(U, "%02x", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    if (temp.length > 0) {
                        const str = temp.reduce((s, v) => {
                            s += printf(U, "%02x", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    temp = []
                }
                callback()
            }
        })
        const rs = createReadStream(path.resolve(infile));
        if (!outFlag)
            rs.pipe(transform).pipe(process.stdout)
        else
            rs.pipe(transform).pipe(fs.createWriteStream(path.resolve(outfile)))
    }
    else {
        const transform = new Transform({
            transform(chunk, encoding, callback) {
                if (readLen + chunk.length < S) {
                    readLen += chunk.length
                    callback()
                    return
                }
                let arr = Array.from(chunk)
                arr.reduce((s, v) => {
                    if ((L === undefined || L !== undefined && readLen2 < L) && (!S || S && readLen >= S)) {
                        s.push(v)
                        readLen2++
                    }
                    readLen++
                    return s
                }, temp)

                while (true) {
                    flag = false
                    if (L) {
                        if (sum + temp.length >= L) {
                            if (temp.length <= C) {
                                flag = true
                            }
                        }
                        else if (temp.length < C) {
                            flag = true
                        }
                    } else {
                        if (temp.length <= C) {
                            flag = true
                        }
                    }
                    if (flag) {
                        const t = temp
                        let str = printf(U, "%08x", offset + sum + S)
                        str += ': '
                        if (C < G) {
                            for (let j = 0; j < C; j++) {
                                str += printf(U, "%02x", t[j])
                            }
                        } else {
                            const gr = Math.floor(C / G)
                            for (let i = 0; i < gr; i++) {
                                for (let j = 0; j < G; j++) {
                                    if (i * G + j < t.length)
                                        str += printf(U, "%02x", t[i * G + j])
                                    else
                                        str += '  '
                                }
                                str += ' '
                            }

                            for (let i = gr * G; i < C; i++) {
                                if (i < t.length)
                                    str += printf(U, "%02x", t[i])
                                else
                                    str += '  '
                            }
                            if (gr * G < C)
                                str += ' '

                        }
                        str += ' '
                        for (let i = 0; i < C; i++) {
                            if (i < t.length) {
                                if (t[i] < 0x20 || t[i] > 0x7e) {
                                    str += '.'
                                } else {
                                    str += String.fromCharCode(t[i])
                                }
                            }
                        }
                        this.push(str + '\n')
                        if (sum + C >= L) {
                            this.destroy()
                        }
                        break
                    } else {
                        const t = temp.slice(0, C)
                        temp = temp.slice(C)
                        let str = printf(U, "%08x", offset + sum + S)
                        str += ': '
                        if (C < G) {
                            for (let j = 0; j < C; j++) {
                                str += printf(U, "%02x", t[j])
                            }
                        } else {
                            const gr = Math.floor(C / G)
                            for (let i = 0; i < gr; i++) {
                                for (let j = 0; j < G; j++) {
                                    str += printf(U, "%02x", t[i * G + j])
                                }
                                str += ' '
                            }
                            for (let i = gr * G; i < C; i++) {
                                str += printf(U, "%02x", t[i])
                            }
                            if (gr * G < C)
                                str += ' '
                        }
                        str += ' '
                        for (let i = 0; i < C; i++) {
                            if (i < t.length) {
                                if (t[i] < 0x20 || t[i] > 0x7e) {
                                    str += '.'
                                } else {
                                    str += String.fromCharCode(t[i])
                                }
                            }
                        }
                        this.push(str + '\n')
                        sum += C
                    }

                }
                callback()
            },
        })
        const rs = createReadStream(path.resolve(infile));
        if (!outFlag)
            rs.pipe(transform).pipe(process.stdout)
        else
            rs.pipe(transform).pipe(fs.createWriteStream(path.resolve(outfile)))
    }

} else {
    //Console
    let temp = []
    let readLen = 0
    let readLen2 = 0
    let sum = 0
    let offset = 0
    if (O) {
        offset += O
    }
    if (I || J) {
        //In console ,they are the same
        if (P) {
            console.warn('warning, option -p is ignored')
            console.log()
        }
        if (O) {
            console.warn('warning, option -o is ignored')
            console.log()
        }
        if (gFlag) {
            console.warn('warning, option -g is ignored')
            console.log()
        }

        let temp = []
        const transform = new new Transform({
            transform(chunk, encoding, callback) {
                let arr = Array.from(chunk)
                //avoid windows 0x0d \r
                if (arr.slice(-2)[0] === 0x0d) {
                    arr.splice(-2, 1)
                }
                temp = arr.reduce((s, v) => {
                    if ((L === undefined || L !== undefined && readLen < L) && (!S || S && readLen >= S))
                        s.push(v)
                    readLen++
                    return s
                }, temp)
                if (L) {
                    while (temp.length > C) {
                        let tmp = temp.slice(0, C)
                        temp = temp.slice(C)
                        const str = tmp.reduce((s, v) => {
                            s += printf(U, "0x%02x, ", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    let str = temp.reduce((s, v) => {
                        s += printf(U, "0x%02x, ", v)
                        return s
                    }, '')
                    str = str.slice(0, -2)
                    this.push(str + '\n')
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
                            s += printf(U, "0x%02x, ", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    let str = temp.reduce((s, v) => {
                        s += printf(U, "0x%02x, ", v)
                        return s
                    }, '')
                    temp = []
                    str = str.slice(0, -2)
                    this.push(str + '\n')
                }
                callback()
            }
        })
        process.stdin.pipe(transform).pipe(process.stdout)
    }
    else if (P) {
        if (O) {
            console.warn('warning, option -o is ignored')
            console.log()
        }
        if (gFlag) {
            console.warn('warning, option -g is ignored')
            console.log()
        }
        let temp = []
        const transform = new Transform({
            transform(chunk, encoding, callback) {
                let arr = Array.from(chunk)
                if (arr.slice(-2)[0] === 0x0d) {
                    arr.splice(-2, 1)
                }
                temp = arr.reduce((s, v) => {
                    if ((L === undefined || L !== undefined && readLen2 < L) && (!S || S && readLen >= S)) {
                        s.push(v)
                        readLen2++
                    }
                    readLen++
                    return s
                }, temp)
                if (L) {
                    while (temp.length >= C) {
                        let tmp = temp.slice(0, C)
                        temp = temp.slice(C)
                        const str = tmp.reduce((s, v) => {
                            s += printf(U, "%02x", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    if (temp.length > 0) {
                        const str = temp.reduce((s, v) => {
                            s += printf(U, "%02x", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
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
                            s += printf(U, "%02x", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    if (temp.length > 0) {
                        const str = temp.reduce((s, v) => {
                            s += printf(U, "%02x", v)
                            return s
                        }, '')
                        this.push(str + '\n')
                    }
                    temp = []
                }
                callback()
            }
        })
        process.stdin.pipe(transform).pipe(process.stdout)
    } else {
        const transform = new Transform({
            transform(chunk, encoding, callback) {
                let arr = Array.from(chunk)
                if (arr.slice(-2)[0] === 0x0d) {
                    arr.splice(-2, 1)
                }
                arr.reduce((s, v) => {
                    if ((L === undefined || L !== undefined && readLen2 < L) && (!S || S && readLen >= S)) {
                        s.push(v)
                        readLen2++
                    }
                    readLen++
                    return s
                }, temp)
                while (true) {
                    flag = false
                    if (L) {
                        if (sum + temp.length >= L) {
                            if (temp.length <= C) {
                                flag = true
                            }
                        }
                        else if (temp.length < C) {
                            break
                        }
                    } else {
                        if (temp.length <= C) {
                            break
                        }
                    }
                    if (flag) {
                        const t = temp
                        let str = printf(U, "%08x", offset + sum + S)
                        str += ': '
                        if (C < G) {
                            for (let j = 0; j < C; j++) {
                                str += printf(U, "%02x", t[j])
                            }
                        } else {
                            const gr = Math.floor(C / G)
                            for (let i = 0; i < gr; i++) {
                                for (let j = 0; j < G; j++) {
                                    if (i * G + j < t.length)
                                        str += printf(U, "%02x", t[i * G + j])
                                    else
                                        str += '  '
                                }
                                str += ' '
                            }
                            for (let i = gr * G; i < C; i++) {
                                if (i < t.length)
                                    str += printf(U, "%02x", t[i])
                                else
                                    str += '  '
                            }
                            if (gr * G < C)
                                str += ' '
                        }
                        str += ' '
                        for (let i = 0; i < C; i++) {
                            if (i < t.length) {
                                if (t[i] < 0x20 || t[i] > 0x7e) {
                                    str += '.'
                                } else {
                                    str += String.fromCharCode(t[i])
                                }
                            }
                        }
                        this.push(str + '\n')
                        process.exit(0)
                    } else {
                        const t = temp.slice(0, C)
                        temp = temp.slice(C)
                        let str = printf(U, "%08x", offset + sum + S)
                        str += ': '
                        if (C < G) {
                            for (let j = 0; j < C; j++) {
                                str += printf(U, "%02x", t[j])
                            }
                        } else {
                            const gr = Math.floor(C / G)
                            for (let i = 0; i < gr; i++) {
                                for (let j = 0; j < G; j++) {
                                    str += printf(U, "%02x", t[i * G + j])
                                }
                                str += ' '
                            }
                            for (let i = gr * G; i < C; i++) {
                                str += printf(U, "%02x", t[i])
                            }
                            if (gr * G < C)
                                str += ' '
                        }

                        str += ' '

                        for (let i = 0; i < C; i++) {
                            if (i < t.length) {
                                if (t[i] < 0x20 || t[i] > 0x7e) {
                                    str += '.'
                                } else {
                                    str += String.fromCharCode(t[i])
                                }
                            }
                        }
                        this.push(str + '\n')
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
