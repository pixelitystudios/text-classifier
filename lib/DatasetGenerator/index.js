Array.prototype.extend = function (other_array) {
    /* You should include a test to check whether other_array really is an array */
    other_array.forEach(function(v) {this.push(v)}, this);
}

class EntityManager{
    constructor(){
        this.entities = []
    }
    /**
     * 
     * @param {*} name 
     * @param {*} synonyms 
     */
    addEntity(name, synonyms){
        this.entities.push({
            name: name,
            synonyms: synonyms
        })
    }
    /**
     * 
     */
    getEntities(){
        const entity = []
        this.entities.map(enti => {
            entity.push({
                "patterns": enti.synonyms,
                "name": enti.name,
                "entity": enti.name
            })
        })
        return entity;
    }
}

class IntentModel{
    /**
     * 
     * @param {*} params 
     */
    constructor(){
        this.template = {
            name: '',
            template: ''
        }
        this.definitions = []
        this.utterances = []
        this.suggestions = []
        this.action = 'generic'
        this.type = 'text'
        this.context = 'generic'
        this.testing = []
        this.responses = []
    }
    /**
     * 
     * @param {*} name 
     * @param {*} template 
     */
    setTemplate(name, template){
        this.template.name = name;
        this.template.template = template;
    }
    /**
     * 
     * @param {*} context 
     */
    setContext(context){
        this.context = context;
    }
    /**
     * 
     * @param {*} type 
     */
    setType(type){
        this.type = type;
    }
    /**
     * 
     * @param {*} action 
     */
    setAction(action){
        this.action = action;
    }
    /**
     * 
     * @param {*} suggestions 
     */
    setSuggestions(suggestions){
        this.suggestions = suggestions
    }
    /**
     * 
     * @param {*} name 
     * @param {*} synonyms 
     */
    addDefinition(name, synonyms){
        this.definitions.push({
            name: name,
            synonyms: synonyms
        })
    }
    /**
     * 
     * @param {*} response 
     */
    addResponse(response){
        this.responses.push(response)
    }
    /**
     * 
     * @param {*} params 
     */
    async generateUtterances(params, entities){
        const intent = {
            "patterns": [],
            "title": this.template.name,
            "suggestions": this.suggestions,
            "action": this.action,
            "type": this.type,
            "entities": [],
            "context": this.context,
            "responses": this.responses
        }
        const testing = []
        let temp = this.template.template.split(' ');
        let sequence = []
        console.log(this.template.name, 'mapping')
        temp.map(t => {
            if(t.startsWith(':')){
                t = t.replace(':','')
                if(t.includes('?')){
                    t = t.replace('?','')
                    sequence.push({
                        type: 'definition',
                        definition: this.definitions.filter(x => x.name == t)[0],
                        optional: true
                    })
                }else{
                    sequence.push({
                        type: 'definition',
                        definition: this.definitions.filter(x => x.name == t)[0],
                        optional: false
                    })
                }
            }else if(t.startsWith('@')){
                t = t.replace('@','')
                if(t.includes('?')){
                    t = t.replace('?','')
                    sequence.push({
                        type: 'entity',
                        entity: entities.filter(x => x.name == t)[0],
                        optional: true
                    })
                }else{
                    sequence.push({
                        type: 'entity',
                        entity: entities.filter(x => x.name == t)[0],
                        optional: false
                    })
                }
            }else if(t.startsWith('(')){
                const regex = /\(([^)]+)\)/
                const matches = regex.exec(t)
                if(matches.length > 0){
                    t = matches[1];
                    if(t.includes('?')){
                        t = t.replace('?','')
                        sequence.push({
                            type: 'word',
                            text: t,
                            optional: true
                        })
                    }else{
                        sequence.push({
                            type: 'word',
                            text: t,
                            optional: false
                        })
                    }
                }
            }
        })
        // for(let i = 0; i < params.testing; i++){
        //     let text = ''
        //     sequence.map(seq => {
        //         if(seq.type == 'definition'){
        //             if(seq.optional){
        //                 let choices = [true, false];
        //                 let choice = choices[Math.floor(Math.random()*choices.length)]
        //                 if(choice){
        //                     text += seq.definition.synonyms[Math.floor(Math.random()*seq.definition.synonyms.length)] + ' '
        //                 }
        //             }else{
        //                 text += seq.definition.synonyms[Math.floor(Math.random()*seq.definition.synonyms.length)] + ' '
        //             }
        //         }else if(seq.type == 'entity'){
        //             if(seq.optional){
        //                 let choices = [true, false];
        //                 let choice = choices[Math.floor(Math.random()*choices.length)]
        //                 if(choice){
        //                     text += seq.entity.entity.synonyms[Math.floor(Math.random()*seq.entity.entity.synonyms.length)] + ' '
        //                 }
        //             }else{
        //                 text += seq.entity.entity.synonyms[Math.floor(Math.random()*seq.entity.entity.synonyms.length)] + ' '
        //             }
                    
        //         }else if(seq.type == 'word'){
        //             let choices = [true, false];
        //             let choice = choices[Math.floor(Math.random()*choices.length)]
        //             if(choice){
        //                 text += seq.text + ' '
        //             }
        //         }
                
        //     })
        //     if(!testing.includes(text)){
        //         testing.push(text);
        //     }else{
        //         i--
        //     }
        // }
        console.log('Generating patterns')
        for(let i = 0; i < params.training; i++){
            let text = ''
            sequence.map(seq => {
                if(seq.type == 'definition'){
                    if(seq.optional){
                        let choices = [true, false];
                        let choice = choices[Math.floor(Math.random()*choices.length)]
                        if(choice){
                            text += seq.definition.synonyms[Math.floor(Math.random()*seq.definition.synonyms.length)] + ' '
                        }
                    }else{
                        text += seq.definition.synonyms[Math.floor(Math.random()*seq.definition.synonyms.length)] + ' '
                    }
                }else if(seq.type == 'entity'){
                    let find = intent.entities.filter(x => x.name == seq.entity.entity.name)
                    if(find.length == 0){
                        intent.entities.push({
                            name: seq.entity.entity.name
                        })
                    }
                    if(seq.optional){
                        let choices = [true, false];
                        let choice = choices[Math.floor(Math.random()*choices.length)]
                        if(choice){
                            text += seq.entity.entity.synonyms[Math.floor(Math.random()*seq.entity.entity.synonyms.length)] + ' '
                        }
                    }else{
                        text += seq.entity.entity.synonyms[Math.floor(Math.random()*seq.entity.entity.synonyms.length)] + ' '
                    }
                }else if(seq.type == 'word'){
                    let choices = [true, false];
                    let choice = choices[Math.floor(Math.random()*choices.length)]
                    if(choice){
                        text += seq.text + ' '
                    }
                }
                
            })
            intent.patterns.push(text.toLowerCase())
        }
        intent.patterns = intent.patterns.filter(function(item, pos) {
            return intent.patterns.indexOf(item) == pos;
        })
        intent.patterns = intent.patterns.map(item => {
            return item.trim()
        })
        return { intent, testing }
    }
}

/**
 * 
 */
class DatasetGenerator{
    /**
     * 
     * @param {*} params 
     */
    constructor(params) {
        this.params = {
            training: 100,
            testing: 100
        }
        if(params){
            Object.keys(params).map(key => {
                this.params[key] = params[key]
            })
        }
        this.intents = []
        this.sentiment = null
        this.dataset = {
            intents: [],
            entities: [],
            testing: [],
            sentiment: []
        }
        this.entity
    }

    /**
     * 
     * @param {*} intent 
     */
    addIntent(intent){
        this.intents.push(intent)
    }
    /**
     * 
     * @param {*} sentiment 
     */
    addSentiment(sentiment){
        this.sentiment = sentiment;
    }
    /**
     * 
     * @param {*} entityManager 
     */
    addEntityManager(entityManager){
        this.dataset.entities = entityManager.getEntities()
    }
    async compileSentimentDataset(){
        Object.keys(this.sentiment).map(word => {
            if(this.sentiment[word] == 'e' || this.sentiment[word] == 'n'){
                this.sentiment[word] = 0;
            }
            this.dataset.sentiment.push({
                "patterns": [word],
                "title": word,
                "suggestions": [],
                "action": "generic",
                "type": "text",
                "score": this.sentiment[word],
                "context": "generic",
                "responses": []
            })
        })
    }
    async compile(){
        if(this.sentiment){
            await this.compileSentimentDataset()
        }
        return Promise.all(this.intents.map(async inte => {
            const { intent, testing } = await inte.generateUtterances(this.params, this.dataset.entities);
            this.dataset.intents.push(intent)
            this.dataset.testing.push(...testing)
        }))
    }
    /**
     * 
     */
    async generate(){
        await this.compile()
        const intents = this.dataset.intents;
        const entities = this.dataset.entities;
        const testing = this.dataset.testing;
        const sentiment = this.dataset.sentiment;
        return { intents, entities, testing, sentiment }
    }
}

module.exports = {
    IntentModel,
    DatasetGenerator,
    EntityManager
}