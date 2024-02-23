import fs from 'fs';
import { globSync } from 'glob';
import { memoize } from 'lodash-es';
import path from 'path';
import sharp from 'sharp';
import { SOURCE_MAP_PATH, TILE_MAP_PATH } from '../config.js';

const minZoom = -3;
const maxZoom = 0;
const MAP_SIZE = 2048;
const TILE_SIZE = 256;

function calcZoomedSize(zoom: number) {
    const factor = Math.pow(2, 3 + zoom);
    return MAP_SIZE / factor;
}

function calcTilesRowAmount(zoom: number) {
    return Math.pow(2, 3 + zoom);
}

function calcTopLeft(size: number, row: number, col: number) {
    return {
        left: row * size,
        top: col * size,
    };
}

function getFilename(zoom: number, amount: number, row: number, col: number) {
    return `${zoom}_${row}_${col - amount}.jpg`;
}

function getTileArgs() {
    const tileArgs = [];
    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
        const size = calcZoomedSize(zoom);
        const amount = calcTilesRowAmount(zoom);
        for (let row = 0; row < amount; row++) {
            for (let col = 0; col < amount; col++) {
                const { top, left } = calcTopLeft(size, row, col);
                const fileName = getFilename(zoom, amount, row, col);
                tileArgs.push({
                    top,
                    left,
                    fileName,
                    zoom,
                    size,
                    amount,
                    col,
                    row,
                });
            }
        }
    }
    return tileArgs;
}

function realGetScaledBuffer(filename: string, zoom: number) {
    const size = MAP_SIZE * Math.pow(2, zoom);
    return sharp(filename).resize(size, size).toBuffer();
}

const getScaledBuffer = memoize(realGetScaledBuffer, (a, b) => [a, b].join('__'));

function tileFile(originalFile: string, outDir: string) {
    fs.mkdirSync(outDir, { recursive: true });
    const tileArgs = getTileArgs();
    return Promise.all(
        tileArgs.map(async (item) => {
            const { col, row, zoom, amount, top, left, fileName, size } = item;
            const destFile = path.join(outDir, fileName);
            if (fs.existsSync(destFile)) {
                return;
            }
            console.log(
                `  + ${originalFile} (${row}, ${col}) @ ${zoom} ${size}; topLeft = (${col * TILE_SIZE}, ${
                    row * TILE_SIZE
                })`,
            );
            return sharp(await getScaledBuffer(originalFile, zoom))
                .extract({
                    top: col * TILE_SIZE,
                    left: row * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                })
                .jpeg({ quality: 90, progressive: true })
                .toFile(destFile);
        }),
    );
}

async function generateAll() {
    // return tileFile(`${SOURCE_MAP_PATH}/w1t1_01.png`, `${TILE_MAP_PATH}/w1t1_01`);
    const files = globSync(`${SOURCE_MAP_PATH}/*.png`);

    await generateBackground();
    for (const file of files) {
        const basename = path.basename(file).replace(/\.png$/, '');
        console.log(`- ${basename}`);
        await tileFile(file, `${TILE_MAP_PATH}/${basename}/`);
    }
}

async function generateBackground() {
    const outputFilePath = `${TILE_MAP_PATH}/bg.jpg`;
    if (fs.existsSync(outputFilePath)) {
        return;
    }
    return sharp(`${SOURCE_MAP_PATH}/region_99.png`).jpeg({ quality: 90, progressive: true }).toFile(outputFilePath);
}

generateAll().catch((e) => {
    console.error(e);
    process.exit(1);
});
