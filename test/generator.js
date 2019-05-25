const fs = require('fs')
const { DatasetGenerator, IntentModel, EntityManager  } = require('../lib');


const datasetGenerator = new DatasetGenerator({
    training: 30,
});

fs.readFile('./data/input/intents.json', 'utf8', function(err, intents){
    fs.readFile('./data/input/sentiments.json', 'utf8', function(err, sentiment){
        fs.readFile('./data/input/entities.json', 'utf8', function(err, entities){
            intents = JSON.parse(intents)
            entities = JSON.parse(entities)
            sentiment = JSON.parse(sentiment)
            
            
            const entityManager = new EntityManager()
            console.log('Adding entitites')
            entities.map(entity => {
                entityManager.addEntity(entity.name, entity.synonyms)
            })
            datasetGenerator.addEntityManager(entityManager)
            datasetGenerator.addSentiment(sentiment)
            console.log('Adding intents')
            intents.map(intent => {
                const intentModel = new IntentModel();
                intentModel.setTemplate(intent.name, intent.template);
                intent.definitions.map(definition => {
                    intentModel.addDefinition(definition.name, definition.synonyms)
                })
                intentModel.setAction(intent.action)
                intent.responses.map(response => {
                    intentModel.addResponse(response)
                })
                datasetGenerator.addIntent(intentModel)
            })
            
            
    
            console.log('Generating...')
            start()
        })  
    })    
})




async function start(){
    const { intents, entities, testing, sentiment} = await datasetGenerator.generate()
    
    fs.writeFile('./data/output/intents.json', JSON.stringify(intents, null, 4), function(){
        console.log('Intents saved')
        fs.writeFile('./data/output/entities.json', JSON.stringify(entities, null, 4), function(){
            console.log('Entities saved')
            fs.writeFile('./data/output/testing.json', JSON.stringify(testing, null, 4), function(){
                console.log('Testing saved')
                fs.writeFile('./data/output/sentiment.json', JSON.stringify(sentiment, null, 4), function(){
                    console.log('Sentiment saved')
        
                })
            })
        })  
    })
}

