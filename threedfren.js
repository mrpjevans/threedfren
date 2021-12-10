const fs = require('fs/promises');

const sharp = require('sharp');

module.exports =  {

    leftImage: null,
    rightImage: null,
    outputImage: null,

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

        return this;
    
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

    // TODO Support buffers
    toSideBySide: async function(filename, cross) {

        const metadata = await sharp(this.leftImage).metadata();
        const width = metadata.width * 2;

        return await sharp({
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
        }]).toFile(filename);

    },

    toCross: function (filename) {
        return this.toSideBySide(filename, true);
    },

    toParallel: function (filename) {
        return this.toSideBySide(filename, false);
    },

    toTriplet: async function (filename) {

        const metadata = await sharp(this.leftImage).metadata();
        const width = metadata.width * 3;

        return sharp({
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
        }]).toFile(filename);

    },

    saveSplit: function (leftFilename, rightFilename) {

        return Promise.all([
            fs.writeFile(leftFilename, this.leftImage),
            fs.writeFile(rightFilename, this.rightImage)
        ]);
    
    },

};
