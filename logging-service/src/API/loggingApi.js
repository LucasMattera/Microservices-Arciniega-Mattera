let express = require('express');
require("dotenv").config();

let token = process.env.LOGGING_TKN;
let PORT = process.env.PORT_ENV;
let running = true;

var winston  = require('winston');
var winlog = require('winston-loggly-bulk');
winston.add(new winlog.Loggly({
    token: token,
    subdomain: "franarci",
    tags: ["Winston-NodeJS"],
    json: true
}));

var log4js = require("log4js");
var logger = log4js.getLogger();
log4js.configure({
    appenders: { cheese: { type: "file", filename: "logs.txt" } },
    categories: { default: { appenders: ["cheese"], level: "error" } }
});

let appLogging = express();
let router = express.Router();
router.use(express.json());

let {errorHandler} = require('./apiErrors');

appLogging.use('/api',router);
appLogging.use(errorHandler);

router.route('/logging')
    .post((req, res,next)=>{ // POST /api/logging/
        if(running){
            try{
                const level = req.body.level;
                const msg = req.body.message;
                logger.level = level;
                switch(level){
                    case "error":
                        logger.error(msg);
                        break;
                    case "warning":
                        logger.warn(msg);
                        break;
                    case "debug":
                        logger.debug(msg);
                        break;                
                    default:
                        logger.info(msg);
                        break;
                }
                winston.log(req.body.level, req.body.message);

            } catch(e) {
                next(e);
            }
        }
        res.status(200);
        res.json("ok");
    })

router.route('/start')
    .post((req, res) => {
        running=true;
        console.log("LOGGING SERVICE ON");
        logger.level = "info";
        logger.info('Server running');
        winston.log("info", "Server running");
        res.status(200).json({status: 200, message: "El servicio de logging esta activo"});
    })

router.route('/stop')
    .post((req, res) => {
        running = false;
        console.log("LOGGING SERVICE OFF");
        logger.level = 'warning';
        logger.warn("Logging service stopped");
        winston.log('warn', 'Logging service stopped')
        res.status(200).json({status: 200, message: "El servicio de logging esta desactivado"});
    })

router.route('/status').get((req, res) => { res.status(200).send(JSON.stringify('OK'))});

appLogging.listen(PORT, () =>{ 
    console.log(`Logging listening on port ${PORT}`);
    logger.level = "info";
    logger.info('Server running');
    winston.log("info", "Server running");
 });

