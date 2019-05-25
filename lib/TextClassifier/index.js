const tf = require('@tensorflow/tfjs')
require('@tensorflow/tfjs-node');
const nlp = require('lorca-nlp')
const shuffle = require('shuffle-array')
const fs = require('fs')

Array.prototype.extend = function (other_array) {
    /* You should include a test to check whether other_array really is an array */
    other_array.forEach(function(v) {this.push(v)}, this);
}

/**
 *
 *
 * @class TextClassifier
 */
class TextClassifier{
    /**
     *Creates an instance of TextClassifier.
     * @param {*} config
     * @memberof TextClassifier
     */
    constructor(config){
        this.metadata = {}
        this.metadata = {}
        this.words = []
        this.intents = []
        this.classes = []
        this.documents = []
        this.training = []
        this.modelPath = (config) ? config.modelPath : null;
        this.output = []
        this.train_x = []
        this.stopTraining = false;
        this.xs = []
        this.ys = []
        this.train_y = []
        this.model;
        this.inputModel;
        this.config = {
            batchSize: 8,
            epochs: 100,
            dropout: 0.25,
            learningRate: 0.0001,
            adamBeta1: 0.025,
            adamBeta2: 0.1,
            confidence: 0.51,
            onEpochEnd: (epoch, log) => {
                console.log({
                    epoch: epoch,
                    log: log
                })
            }
        }
        if(config){
            for(let c of Object.keys(config)){
                if(this.config[c]){
                    this.config[c] = config[c];
                }
            }
        }
    }
    /**
     *
     *
     * @param {*} intents
     * @returns
     * @memberof TextClassifier
     */
    async processIntent(intents){
        let dataset = {
            intents: []
        }
        console.log('Intents recognized: ' + intents.length)
        
        for(let n of intents){
            dataset.intents.push({
                tag: '_' + Math.random().toString(36).substr(2, 9),
                patterns: n.patterns,
                responses: n.responses,
                extras: n
            })
        }
        return dataset
    }
    /**
     *
     *
     * @param {*} intents
     * @memberof TextClassifier
     */
    async compile(intents){
        intents = await this.processIntent(intents);
        this.intents = intents;
        // loop through each sentense in our intents patterns
        intents.intents.map(async (intent) => await this.stemPattern(intent))
        // stem and lower each word
        let words = []
        this.words.map((w, index) => (w == '') ? null : words.push( nlp(w).stem(w.toLowerCase()).replace(/[?]/g, '')))
        // remove duplicates
        words = words.filter((item, pos) =>  words.indexOf(item) == pos)
        this.words = words;
        // remove duplicates
        this.classes = this.classes.filter((item, pos) => this.classes.indexOf(item) == pos);
        // training set, bag of words for each sentence
        this.documents.map((doc, index) => {
            // initialize our bag of words
            let bag = []
            // list of tokenized words for the pattern
            let pattern_words = doc[0]
            // stem each word
            pattern_words = pattern_words.map((word) => nlp(word).stem(word.toLowerCase()))
            // create our bag of words array
            words.map((w, i) => (pattern_words.includes(w)) ? bag.push(1) : bag.push(0))
            // create an empty array for our output
            let output_row = Array(this.classes.length).fill(0);
            // output is a '0' for each tag and '1' for current tag
            output_row[this.classes.indexOf(doc[1])] = 1
            // add our bag of words and output_row to our training list
            this.training.push([bag, output_row])
        })
        // shuffle our features and turn into np.array
        shuffle(this.training);
        this.training.map((item) => {
            this.train_x.push(item[0])
            this.train_y.push(item[1])
        })
        this.metadata.words = this.words
        this.metadata.documents = this.documents
        this.metadata.classes = this.classes
        this.metadata.shape = [this.train_x[0].length,this.train_y[0].length]
        this.metadata.intents = this.intents
        this.metadata.history = []
    }
    /**
     *
     *
     * @memberof TextClassifier
     */
    async train(config){
        const optimizer = tf.train.adam(this.config.learningRate)
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 256, activation: 'relu', inputShape: [this.train_x[0].length] }));
        model.add(tf.layers.dropout({rate: this.config.dropout}));
        model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
        model.add(tf.layers.dropout({rate: this.config.dropout}));
        model.add(tf.layers.dense({ units: this.train_y[0].length, activation: 'softmax' }));
        model.compile({ optimizer: optimizer, loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
        model.summary()
        const xs = tf.tensor(this.train_x);
        const ys = tf.tensor(this.train_y);
        for(let i = 1; i < this.config.epochs; i++){
           
            if(!this.stopTraining){
                console.log(`Epoca: ${i}/${this.config.epochs}`)
                await model.fit(xs, ys, {
                    epochs: config.generations,
                    batchSize: this.config.batchSize,
                    shuffle: true,
                    // verbose: 1,
                    callbacks: {
                        onEpochEnd: async (epoch, log) => {
                            this.metadata.history.push({
                                epoch: epoch,
                                log: log
                            })
                            this.config.onEpochEnd(epoch, log)
                            await tf.nextFrame()
                            if(this.stopTraining){
                                model.stopTraining = true;
                            }
                            if(log.loss < this.config.learningRate){
                                this.stopTraining = true;
                            }
                        }
                    }
                })
            }
        }
        this.model = model;
        await model.save('file://' + this.modelPath)
        fs.writeFile(this.modelPath + '/metadata.json', JSON.stringify(this.metadata, null, 4),function(err){
            console.log('Model saved')
        })
        this.model.dispose()
        xs.dispose()
        ys.dispose()
    }
    /**
     *
     *
     * @param {*} input
     * @returns
     * @memberof TextClassifier
     */
    async prepareInput(input){
        let bag = Array(this.metadata.train_x[0].length).fill(0);
        let sentence = nlp(input).words().get();
        let words = []
        sentence.map((w, index) => words.push( nlp(w).stem(w.toLowerCase()).replace(/[?]/g, '')))
        this.metadata.words.map((word, index) => {
            words.map((w,i) => {
                if(w == word){
                    bag[index] = 1
                }
            })
        })
        return bag;     
    }
    /**
     *
     *
     * @param {*} sentence
     * @returns
     * @memberof TextClassifier
     */
    async predict(sentence){
        const bag = await this.prepareInput(sentence);
        let _this = this;
        return await tf.tidy(()=>{
            //converter to tensor array
            let data = tf.tensor2d(bag, [1, bag.length]);
            //generate probabilities from the model
            let predictions = this.model.predict(data).dataSync();
            //filter out predictions below a threshold
            let prediction = {
                accuracy: 0,
                intent: null
            };
            predictions.map((p, i) => {
                if(p > this.config.confidence){
                    let intent = this.metadata.intents.intents.filter((c) => (this.metadata.classes[i] == c.tag) ? c : null)[0]
                    prediction.accuracy = p;
                    prediction.intent = intent
                }
            })
            return prediction;
        }) 
    }

    async predictBatch(bag, correct){
        return await tf.tidy(()=>{
            let data = tf.tensor2d(bag, [1, bag.length]);
            let predictions = this.model.predict(data).dataSync();
            let ps = []
            predictions.map((p, i) => {
                if(p > this.config.confidence){
                    let index = 0;
                    this.metadata.intents.intents.filter((c, ii) => {
                        if(this.metadata.classes[i] == c.tag){
                            index = ii;
                        }
                    })
                    ps.push(p,index,correct, (index == correct) ? true : false);
                }
            })
            return ps;
        }) 
    }
    /**
     *
     *
     * @param {*} text
     * @param {*} name
     * @memberof TextClassifier
     */
    downloadTextFile(text, name) {
        const a = document.createElement('a');
        const type = name.split(".").pop();
        a.href = URL.createObjectURL( new Blob([text], { type:`text/${type === "txt" ? "plain" : type}` }) );
        a.download = name;
        a.click();
    }
    /**
     *
     *
     * @param {*} file
     * @returns
     * @memberof TextClassifier
     */
    async fetch(file){
        return new Promise((resolve, reject) => {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() { 
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
                    resolve(JSON.parse(xmlHttp.responseText));
                }
            }
            xmlHttp.open("GET", file, true); // true for asynchronous 
            xmlHttp.send(null);
        })
    }
    /**
     *
     *
     * @param {*} config
     * @returns
     * @memberof TextClassifier
     */
    async loadModel(config){
        let self = this;
        return new Promise(async (resolve, reject) => {
            this.model = await tf.loadModel('file://' + config.model + '/model.json');
            if(this.model){
                fs.readFile(config.model + '/metadata.json', 'utf8', function(err, data){
                    if(!err){
                        console.log('Model loaded')
                        resolve(this)
                        self.metadata = JSON.parse(data);
                    }else{
                        console.log('No metadata found on ' + config.model + ' path')
                        process.exit()
                    }
                })
            }else{
                console.log('Catn load the model')
                process.exit()
            }
        })
    }

    async splitData(data, classes, size){
        let test_x = []
        let test_y = []
        for(let i = 1; i < size; i++){
            let index = Math.floor(Math.random()*data.length);
            test_x.push(data[index])
            test_y.push(classes[index])
        }
        return [test_x, test_y]
    }

    /**
     *
     *
     * @param {*} splitSize
     * @memberof TextClassifier
     */
    async validateTest(testSize){
        let [test_x, test_y] = await this.splitData(this.metadata.train_x, this.metadata.train_y, testSize);
        let count = 0;
        let fail = [];
        let percentage = 0;
        for(let i = 0; i < test_x.length; i++){
            let x = test_x[i];
            let prediction = await this.predictBatch(x, test_y[i].findIndex(y => y == 1));
            if(prediction[3]){
                count++;
            }else{
                fail.push(prediction);
            }
        }
        console.log('Correct answers: ' + (count + 1) + '/' + testSize)
        console.log('----------------------------------------------')
        if(fail.length > 0){
            console.log('Incorrect answers: ' + fail.length)
            console.log(fail)
        }
    }
    /**
     *
     *
     * @param {*} input
     * @returns
     * @memberof TextClassifier
     */
    async prepareInput(input){
        let bag = Array(this.metadata.train_x[0].length).fill(0);
        let sentence = nlp(input).words().get();
        let words = []
        sentence.map((w, index) => words.push( nlp(w).stem(w.toLowerCase()).replace(/[?]/g, '')))
        this.metadata.words.map((word, index) => {
            words.map((w,i) => {
                if(w == word){
                    bag[index] = 1
                }
            })
        })
        return bag;     
    }
    /**
     *
     *
     * @param {*} intent
     * @memberof TextClassifier
     */
    stemPattern(intent){
        // loop through each sentense in our intents patterns
        intent.patterns.map((pattern, i) => {
            // tokenize each word in the sentence
            let w = nlp(pattern).words().get()
            // add to our word list
            this.words.extend(w);
            // add to documents in our corpus
            this.documents.push([w, intent.tag])
            // add to our classes list
            if(!this.classes.includes(intent.tag)){
                this.classes.push(intent.tag)
            }
        })
    }
}
module.exports.TextClassifier = TextClassifier
module.exports.tf = tf