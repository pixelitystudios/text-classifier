const tf = require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node');
const nlp = require('lorca-nlp')
const shuffle = require('shuffle-array')
const fs = require('fs')


Array.prototype.extend = function (other_array) {
    /* You should include a test to check whether other_array really is an array */
    other_array.forEach(function(v) {this.push(v)}, this);
}

class DataUtils{
    constructor(){

    }
    prepareData(text, seqLength) {
        let data = text.split("");
        let [vocab,indVocab] = this.getVocab(data);
        let dataX = [];
        let dataY = [];
        for (let i = 0; i < data.length - seqLength; i++){
            let inSeq = data.slice(i, i+seqLength);
            let outSeq = data[i+seqLength];
            dataX.push(inSeq.map(x=>this.oneHot(vocab.size, vocab.get(x))));
            dataY.push(this.oneHot(vocab.size, vocab.get(outSeq)));
        }
        return [dataX, dataY, vocab, indVocab];
    }

    oneHot(size, at){
        let vector = [];
        for(let i = 0; i < size; i++){
            if(at == i){
                vector.push(1);
            }
            else{
                vector.push(0);
            }
        }
        return vector;
    }
    oneHotString(text, vocab){
        let output = [];
        for(let i =0; i < text.length; i++){
            let onehot = this.oneHot(vocab.size, vocab.get(text.charAt(i)));
            output.push(onehot);
        }
        return output;
    }

    async decodeOutput(data, vocab) {
        let output = [];
        for(let i = 0; i < data.shape[0]; i++){
            let tensor = data.slice(i, 1);
            tensor = tensor.reshape([vocab.length])
            let index = tensor.argMax();
            index = await index.data();
            index = index[0];
            let letter = vocab[index];
            output.push(letter);
        }
        return output.join("");
    }

    getVocab(arr) {
        //get letter mapped to amount of occurances
        let counts = new Map();
        for(let i of arr){
            if(counts.has(i)){
                const value = counts.get(i);
                counts.set(i, value+1);
            }
            else {
                counts.set(i, 1);
            }
        }
        // here we are taking those occurances and turning it in
        // into a map from letter to how frequetly it appears relative to other letters
        let indVocab = [];
        let vocab = new Map(Array.from(counts).sort((a, b) => {
            return b[1] - a[1];
        }).map((value, i) => {
            indVocab.push(value[0]);
            return [value[0], i];
        }));
      
        return [vocab, indVocab];
    }
}

class TextGeneration{
    constructor(options){
        if (options.seqLength &&
            options.hiddenSize &&
            options.numLayers &&
            options.vocab &&
            options.indexToVocab){
            this.seqLength = options.seqLength;
            this.hiddenSize = options.hiddenSize;
            this.numLayers = options.numLayers;
            this.vocab = options.vocab;
            this.indexToVocab = options.indexToVocab
            this.outputKeepProb = options.outputKeepProb;
            this.dataUtils = new DataUtils();
            this.stopTraining = false;
            this.modelPath = options.modelPath;
            this.learningRate = options.learningRate
        }
        else {
            throw new Error("Missing some needed parameters");
        }
    }


    async init(options) {
        const logger = options && options.logger ? options.logger : console.log;
    
        logger("setting up model...");
    
        let cells = [];
        for(let i = 0; i < this.numLayers; i++) {
            const cell = await tf.layers.lstmCell({
                units: this.hiddenSize
            });
            cells.push(cell);
        }
    
        const multiLstmCellLayer = await tf.layers.rnn({
            cell: cells,
            returnSequences: true,
            inputShape: [this.seqLength, this.vocab.size]
        });
    
        const dropoutLayer = await tf.layers.dropout({
            rate: this.outputKeepProb
        });
    
        const flattenLayer = tf.layers.flatten();
    
        const denseLayer = await tf.layers.dense({
            units: this.vocab.size,
            activation: 'softmax',
            useBias: true
        });
    
        const model = tf.sequential();
        model.add(multiLstmCellLayer);
        model.add(dropoutLayer);
        model.add(flattenLayer);
        model.add(denseLayer);
    
        logger("compiling...");
    
        model.compile({
            loss: 'categoricalCrossentropy', 
            optimizer: 'adam'
        });
    
        logger("done.");
    
        this.model = await model;
    }

    async train(inData, outData, options) {
        const logger = options && options.logger ? options.logger : console.log;
        const batchSize = options.batchSize;
        const epochs = options && options.epochs ? options.epochs : 1;
        for(let i = 0; i < epochs; i++){
            const modelFit = await this.model.fit(inData, outData, {
                batchSize: batchSize,
                epochs: 1,
                callbacks: {
                    onEpochEnd: async (epoch, log) => {
                        console.log('Epoch: ' + epoch, 'Loss: ', log.loss)
                        await tf.nextFrame()
                        if(this.stopTraining){
                            model.stopTraining = true;
                        }
                        if(log.loss < this.learningRate){
                            this.stopTraining = true;
                        }
                    }
                }
            });
            await model.save('file://' + this.modelPath)
            logger("Loss after epoch " + (i+1) + ": " + modelFit.history.loss[0]);
        }
    }

    async predict(primer, amnt){
        let startIndex = primer.length - this.seqLength - 1;
        let output = tf.tensor(primer);
        for(let i = 0; i < amnt; i++){
            let slicedVec = output.slice(i + startIndex,this.seqLength);
            slicedVec = slicedVec.reshape([1, slicedVec.shape[0], slicedVec.shape[1]]);
            let next = await this.model.predict(slicedVec, {
                batchSize: 1,
                epochs: 1
            });
            output = output.concat(next);
        }
        return this.dataUtils.decodeOutput(output, this.indexToVocab);
    }
}

module.exports.TextGeneration = TextGeneration;
module.exports.DataUtils = DataUtils;