#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const fs = require('fs')

const { TextGeneration, DataUtils } = require('../lib/TextGeneration')
const tf = require('@tensorflow/tfjs')

let model;

const askQuestions = () => {
    const questions = [
        {
            name: "batchSize",
            type: "input",
            default: 1,
            message: "What's the batch size the I.A will use?"
        },
        {
            name: "epochs",
            type: "input",
            default: 1,
            message: "What's the number of epochs the I.A will use to train?"
        },
        {
            name: "dropout",
            type: "input",
            default: 0.2,
            message: "What's the dropout the I.A will use to train?"
        },
        {
            name: "seqLength",
            type: "input",
            default: 2,
            message: "What's the sequence length the I.A will use to train?"
        },
        {
            name: "modelPath",
            type: "input",
            default: "speakmodel",
            message: "What's the model name?"
        },
        {
            name: "dataset",
            type: "input",
            default: "messages.txt",
            message: "What's the dataset file?"
        }
    ];
    return inquirer.prompt(questions);
};

const init = () => {
    console.log(
      chalk.blue(
        figlet.textSync("Pixelity Studios", {
            font: "Standard",
            horizontalLayout: "default",
            verticalLayout: "default"
        })
      )
    );
}

const run = async () => {
    // show script introduction
    init()
    // ask questions
    const answers = await askQuestions();
    const { batchSize, epochs, dropout, seqLength, modelPath, dataset } = answers;
    const dataUtils = new DataUtils()

    async function train(trainIn, trainOut) {
        await model.train(trainIn, trainOut, {
            batchSize: batchSize,
            epochs: epochs
        });
    }

    async function compile() {
        fs.readFile('./data/output/' + dataset, 'utf8', async (err, data) => {
            if(!err){
                console.log(chalk.green('Preparing the data'))
                let [trainIn, trainOut, vocab, indexToVocab] = dataUtils.prepareData(data, seqLength);
                globalVocab = vocab;
                trainIn = tf.tensor(trainIn);
                trainOut = tf.tensor(trainOut);

                model = new TextGeneration({
                    seqLength: seqLength,
                    outputKeepProb: dropout,
                    vocab: vocab,
                    indexToVocab: indexToVocab,
                    numLayers: 2,
                    hiddenSize: 128,
                    modelPath: './models/' + modelPath,
                    learningRate: 0.01
                });

                // set up model
      
                console.log(chalk.green('Compiling the model'))
                console.log(chalk.blue('Start training'))
                await model.init();
                train(trainIn, trainOut)
            }else{
                console.log(chalk.red('No dataset found on ' + dataset + ' path'))
            }
        })
    }

    compile()
};

process.on('SIGINT', function() {

    if(model){
        model.stopTraining = true;
    }
});
run();