#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const fs = require('fs')

const { TextClassifier } = require('../lib/TextClassifier')
const tf = require('@tensorflow/tfjs')

let model;

const askQuestions = () => {
    const questions = [
        {
            name: "batchSize",
            type: "input",
            default: 10,
            message: "What's the batch size the I.A will use?"
        },
        {
            name: "epochs",
            type: "input",
            default: 3000,
            message: "What's the number of epochs the I.A will use to train?"
        },
        {
            name: "generations",
            type: "input",
            default: 1,
            message: "What's the number of generations the I.A will use to train?"
        },
        {
            name: "dropout",
            type: "input",
            default: 0.25,
            message: "What's the dropout the I.A will use to train?"
        },
        {
            name: "learningRate",
            type: "input",
            default: 0.001,
            message: "What's the learning rate the I.A will use to train?"
        },
        {
            name: "confidence",
            type: "input",
            default: 0.51,
            message: "What's the confidence the I.A will use to train?"
        },
        {
            name: "minLoss",
            type: "input",
            default: 0.0001,
            message: "What's the min loss the I.A will use to train?"
        },
        {
            name: "modelPath",
            type: "input",
            default: "pixy",
            message: "What's the model name?"
        },
        {
            name: "dataset",
            type: "input",
            default: "pixy.json",
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
    const { batchSize, epochs, generations, dropout, learningRate, confidence, minLoss, modelPath, dataset } = answers;
    // create the model
    model = new TextClassifier({
        batchSize: Number(batchSize),
        epochs: Number(epochs),
        learningRate: learningRate,
        modelPath: './models/' + modelPath,
        dropout: Number(dropout),
        confidence: Number(confidence),
        onEpochEnd: async (epoch, log) => {
            console.log(chalk.green(`Generation: ${epoch}, Loss: ${log.loss}, Acc: ${log.acc}`))
            await tf.nextFrame()
            if(log.loss < Number(minLoss)){
                model.stopTraining = true;
                setTimeout(() => {
                    process.exit();
                }, 10000)
            }
        }
    });

    async function train() {
        await model.train({
            local: true,
            path: modelPath,
            generations: Number(generations)
        })
    }

    async function compile() {
        fs.readFile('./data/output/' + dataset, 'utf8', async (err, data) => {
            if(!err){
                let intents = JSON.parse(data);
                console.log(chalk.green('Compiling the model'))
                await model.compile(intents)
                console.log(chalk.blue('Start training'))
                train()
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