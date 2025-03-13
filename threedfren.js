const os = require('os');
const fs = require('fs/promises');
const { exec } = require('child_process');

const sharp = require('sharp');

module.exports =  {

    leftImage: null,
    rightImage: null,

    loadSpatialHEIC: async function(filepath) {
        
        if (os.platform() !== 'darwin' || os.arc !== 'arm64') {
            throw new Error('This function is only supported on macOS with Apple Silicon');
        }

        // Call the app 'spatial' with the filepath and a temporary output file as arguments
        const output = await fs.mkdtemp('spatial');
        const command = `spatial export -i ${filepath} -o ${output}/left.jpg -o ${output}/right.jpg`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                throw new Error(`Could not convert spatial HEIC: ${error.message}`);
            }
        });

        try {
            this.leftImage = await fs.readFile(`${output}/left.jpg`);
            this.rightImage = await fs.readFile(`${output}/right.jpg`);
        } catch(err) {
            throw new Error('Could not access input file');
        }
            
    },

    loadMpo: async function(filepath) {
        
        let mpoImage;

        try {
            mpoImage = await fs.readFile(filepath);
        } catch(err) {
            throw new Error('Could not access input file');
        }

        const breakPoint = mpoImage.subarray(1).indexOf(Buffer.from('ffd8ffe1', 'hex'));
        if (breakPoint === -1) {
            throw new Error('Not a valid MPO file');
        }

        this.leftImage = mpoImage.subarray(0, breakPoint);
        this.rightImage = mpoImage.subarray(breakPoint + 1);
    
    },

    loadImagePair: async function(leftFilepath, rightFilepath) {
        this.loadLeftImage(leftFilepath);
        this.loadRightImage(rightFilepath);  
    },

    loadLeftImage: async function(filepath) {
        try {
            this.leftImage = await fs.readFile(filepath);
        } catch(err) {
            throw new Error('Could not access input file');
        }
    },

    loadRightImage: async function(filepath) {
        try {
            this.rightImage = await fs.readFile(filepath);
        } catch(err) {
            throw new Error('Could not access input file');
        }
    },

    toSideBySide: async function(filename = null, cross = false, half = false) {

        const metadata = await sharp(this.leftImage).metadata();
        const width = metadata.width * 2;

        if (half) {
            this.leftImage = await sharp(this.leftImage).resize({ width: metadata.width / 2 }).toBuffer();
            this.rightImage = await sharp(this.rightImage).resize({ width: metadata.width / 2 }).toBuffer();
        }

        const newImage = await sharp({
            create: {
                width,
                height: metadata.height,
                channels: 3,
                background: { r: 0, g: 0, b: 0 }
            }
        }).composite([{
            input: cross ? this.rightImage : this.leftImage,
            left: 0,
            top: 0
        },{
            input: cross ? this.leftImage : this.rightImage,
            left: metadata.width,
            top: 0
        }])

        return filename ? newImage.toFile(filename) : newImage.toBuffer();
        
    },

    toCross: function (filename = null, half = false) {
        return this.toSideBySide(filename, true, half);
    },

    toParallel: function (filename = null, half = false) {
        return this.toSideBySide(filename, false, half);
    },

    toTriplet: async function (filename = null) {

        const metadata = await sharp(this.leftImage).metadata();
        const width = metadata.width * 3;

        const newImage = await sharp({
            create: {
                width,
                height: metadata.height,
                channels: 3,
                background: { r: 0, g: 0, b: 0 }
            }
        }).composite([{
            input: this.leftImage,
            left: 0,
            top: 0
        },{
            input: this.rightImage,
            left: metadata.width,
            top: 0
        },{
            input: this.leftImage,
            left: metadata.width * 2,
            top: 0
        }]);

        return filename ? newImage.toFile(filename) : newImage.toBuffer();

    },

    toMPO: async function (filename = null) {

        const newImage = Buffer.concat([this.leftImage, this.rightImage]);

        return filename ? fs
            .writeFile(filename, newImage)
            .then(() => filename) : newImage;
    },

    toAnaglyph: async function (filename = null) {
        try {
          // Load the left and right images
          const [leftImageMetadata, rightImageMetadata] = await Promise.all([
            sharp(this.leftImage).metadata(),
            sharp(this.rightImage).metadata()
          ]);
          
          // Extract red channel from left image (keep as grayscale)
          const leftRed = await sharp(this.leftImage)
            .extractChannel('red')
            .toBuffer();
          
          // Extract green and blue channels from right image
          const rightGreen = await sharp(this.rightImage)
            .extractChannel('green')
            .toBuffer();
          
          const rightBlue = await sharp(this.rightImage)
            .extractChannel('blue')
            .toBuffer();
          
          // Create a new image with RGB channels from the appropriate sources
          const newImage = await sharp({
            create: {
              width: leftImageMetadata.width,
              height: leftImageMetadata.height,
              channels: 3,
              background: { r: 0, g: 0, b: 0 }
            }
          }).joinChannel(leftRed)      // Red channel from left image
            .joinChannel(rightGreen)   // Green channel from right image
            .joinChannel(rightBlue);    // Blue channel from right image
            
            return filename ? await newImage.toFile(filename) : newImage.toBuffer
          
          
        } catch (error) {
          console.error('Error creating anaglyph:', error);
          throw error;
        }
    },

    toAnaglyphX: async function (filename = null) {

        const metadata = await sharp(this.leftImage).metadata();
        const width = metadata.width;
        const height = metadata.height;

        const newImage = await sharp({
            create: {
                width,
                height,
                channels: 3,
                background: { r: 0, g: 0, b: 0 }
            }
        }).composite([{
            input: this.leftImage,
            left: 0,
            top: 0
        },{
            input: this.rightImage,
            left: 0,
            top: 0
        }]).modulate({ saturation: 0 });

        return filename ? newImage.toFile(filename) : newImage.toBuffer
    
    },

    toBlackAndWhiteAnaglyphX: async function (filename = null) {
        const metadata = await sharp(this.leftImage).metadata();
        const width = metadata.width;
        const height = metadata.height;

        const newImage = await sharp({
            create: {
                width,
                height,
                channels: 3,
                background: { r: 0, g: 0, b: 0 }
            }
        }).composite([{
            input: await sharp(this.leftImage).tint('red').toBuffer(),
            left: 0,
            top: 0,
            blend: 'over'
        },{
            input: await sharp(this.leftImage).tint('green').toBuffer(),
            left: 0,
            top: 0,
            blend: 'add'
        }]);

        return filename ? newImage.toFile(filename) : newImage.toBuffer;

    },

    saveSplit: function (leftFilename, rightFilename) {

        return Promise.all([
            fs.writeFile(leftFilename, this.leftImage),
            fs.writeFile(rightFilename, this.rightImage)
        ]);
    
    },

};
