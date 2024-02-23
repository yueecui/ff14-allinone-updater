import fs from 'fs';
import sharp from 'sharp';

// 重置画布大小
export type ConvertImageInput = {
    fromFilePath: string;
    toDir: string;
    newDir?: string; // 新文件备份的路径
    fileNamePrefix?: string;
    fileNameSuffix?: string;
    format?: 'webp' | 'png';
    // 重铸画布的尺寸
    canvasWidth?: number; // 如果要重铸则必须指定
    canvasHeight?: number;
    // 重新缩放的尺寸
    resizeWidth?: number;
    resizeHeight?: number;
};

async function resizeCanvas({ fromFilePath, canvasWidth, canvasHeight, resizeWidth, resizeHeight }: ConvertImageInput) {
    const input = fs.readFileSync(fromFilePath);
    const image = sharp(input);

    const metadata = await image.metadata();
    const inputWidth = metadata.width!;
    const inputHeight = metadata.height!;

    canvasHeight = canvasHeight || canvasWidth;

    let canvas =
        canvasWidth && canvasHeight
            ? sharp({
                  create: {
                      width: canvasWidth,
                      height: canvasHeight,
                      channels: 4,
                      background: { r: 0, g: 0, b: 0, alpha: 0 },
                  },
              })
            : sharp(input);

    if (canvasWidth && canvasHeight) {
        // 将原图片居中放置在画布上
        // 如果原图片超过画布，先进行缩放
        if (inputWidth > canvasWidth || inputHeight > canvasHeight) {
            if (inputWidth > inputHeight) {
                image.resize(canvasWidth, null);
            } else {
                image.resize(null, canvasHeight);
            }
        }

        const buffer = await image.png().toBuffer();

        const offsetX = Math.floor((canvasWidth - inputWidth) / 2);
        const offsetY = Math.floor((canvasHeight - inputHeight) / 2);
        canvas.composite([{ input: buffer, left: offsetX, top: offsetY }]);
    }

    if (resizeWidth) {
        canvas = sharp(await canvas.png().toBuffer());
        resizeHeight = resizeHeight || resizeWidth;
        canvas.resize(resizeWidth, resizeHeight);
    }

    return canvas;
}

// 缩放图片
async function resizeImage({ fromFilePath, resizeWidth, resizeHeight }: ConvertImageInput) {
    const input = fs.readFileSync(fromFilePath);
    const image = sharp(input);

    const metadata = await image.metadata();
    const inputWidth = metadata.width!;
    const inputHeight = metadata.height!;

    const canvas = sharp(input);
    if (resizeWidth) {
        resizeHeight = Math.floor((resizeWidth / inputWidth) * inputHeight);
        canvas.resize(resizeWidth, resizeHeight);
    }

    return canvas;
}

export const convertImage = async (input: ConvertImageInput) => {
    const { fromFilePath, toDir, newDir, fileNamePrefix, fileNameSuffix, format = 'webp', canvasWidth } = input;

    const canvas = await (async () => {
        if (canvasWidth) {
            return await resizeCanvas(input);
        } else {
            return await resizeImage(input);
        }
    })();

    if (format === 'webp') {
        canvas.webp();
    } else {
        canvas.png();
    }

    // 读取原始文件名
    const fileName = fromFilePath.split('\\').pop()!;
    // 替换文件后缀
    const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.');

    const newFileName = `${fileNamePrefix ?? ''}${fileNameWithoutExt}${fileNameSuffix ?? ''}.${format}`;

    // 保存到上传目录
    fs.mkdirSync(toDir, { recursive: true });
    const toFilePath = `${toDir}\\${newFileName}`;
    await canvas.toFile(toFilePath);

    // 保存到新备份目录
    if (newDir) {
        fs.mkdirSync(newDir, { recursive: true });
        const newFilePath = `${newDir}\\${newFileName}`;
        await canvas.toFile(newFilePath);
    }
};

export const imageResize = async () => {
    const fromDir = 'D:\\StarRail\\starrail-wiki-workspace\\image\\input';
    const toDir = 'D:\\StarRail\\starrail-wiki-workspace\\image\\output';

    const dir = fs.readdirSync(fromDir);
    for (const file of dir) {
        const fromFilePath = `${fromDir}\\${file}`;
        console.log(`正在处理：${fromFilePath}`);
        await convertImage({
            fromFilePath,
            // fileNamePrefix: 'ItemIcon_',
            // fileNameSuffix: '_64',
            toDir,
            canvasWidth: 128,
            // resizeWidth: 128,
            format: 'webp',
        });
    }
};

// 如果直接运行
if (require.main === module) {
    imageResize();
}
