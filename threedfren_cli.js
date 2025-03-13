#!/usr/bin/env node

const path = require('path');
const { program } = require('commander');
const threedfren = require('./threedfren.js');

// Set up CLI version and description
program
  .name('threedfren')
  .description('Process 3D images in MPO format and create various stereo image outputs')
  .version('1.0.0');

// Command for processing MPO files to side-by-side format
program
  .command('sbs <input> <output>')
  .description('Convert MPO file to side-by-side format')
  .option('-c, --cross', 'Create cross-eyed format instead of parallel')
  .action(async (input, output, options) => {
    try {
      await threedfren.loadMpo(input);
      if (options.cross) {
        console.log(`Converting ${input} to cross-eyed format...`);
        await threedfren.toCross(output);
      } else {
        console.log(`Converting ${input} to parallel format...`);
        await threedfren.toParallel(output);
      }
      console.log(`Successfully created ${output}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Command for creating triplet format
program
  .command('triplet <input> <output>')
  .description('Convert MPO file to triplet format (left-right-left)')
  .action(async (input, output) => {
    try {
      console.log(`Converting ${input} to triplet format...`);
      await threedfren.loadMpo(input);
      await threedfren.toTriplet(output);
      console.log(`Successfully created ${output}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Command for splitting MPO file into separate left and right images
program
  .command('split <input> <leftOutput> <rightOutput>')
  .description('Split MPO file into separate left and right image files')
  .action(async (input, leftOutput, rightOutput) => {
    try {
      console.log(`Splitting ${input} into left and right images...`);
      await threedfren.loadMpo(input);
      await threedfren.saveSplit(leftOutput, rightOutput);
      console.log(`Successfully created ${leftOutput} and ${rightOutput}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Command for combining separate images into stereo formats
program
  .command('combine <leftInput> <rightInput> <output>')
  .description('Combine separate left and right images into various stereo formats')
  .option('-c, --cross', 'Create cross-eyed format')
  .option('-p, --parallel', 'Create parallel format (default)')
  .option('-t, --triplet', 'Create triplet format (left-right-left)')
  .action(async (leftInput, rightInput, output, options) => {
    try {
      console.log(`Loading images ${leftInput} and ${rightInput}...`);
      await threedfren.loadLeftImage(leftInput);
      await threedfren.loadRightImage(rightInput);
      
      if (options.triplet) {
        console.log('Creating triplet format...');
        await threedfren.toTriplet(output);
      } else if (options.cross) {
        console.log('Creating cross-eyed format...');
        await threedfren.toCross(output);
      } else {
        console.log('Creating parallel format...');
        await threedfren.toParallel(output);
      }
      
      console.log(`Successfully created ${output}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Display help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}