/*
 * IOChannel
 * 
 *   Useful for sending character input to and from the interpreter. One
 * channel is used to take input from the user's shell, and another is
 * used to receive output from the interpreter and echo it to the client.
 */
var IOChannel = function(){
    this.buffer = "";

    /*
     * read
     *
     *   Attempt to read "count" characters from the buffer.  If "count
     * is greater than the number of characters in the buffer return as
     * many as possible.  The number of characters returned can be 
     * determined by the caller by examining the length property of the
     * string returned;
     */
    this.read = function(count){
        var count   = count === undefined ? 1 : count; //assume read(1) because that is what I'm going to be doing most often
        var output  = this.buffer.slice(0, count);
        this.buffer = this.buffer.slice(count, this.buffer.length);
    };

    /*
     * write
     * 
     *   Append the string to the buffer.
     */
    this.write = function(data){
        if(data !== undefined){
            this.buffer.concat(data);
        }
    };

    /*
     * clear
     * 
     *   Empty the buffer.
     */
    this.clear = function(){
        this.buffer = "";
    };
};

/*
 * Interpreter
 * 
 *   A very forgiving brainfuck interpreter.  Attempting to move beyond the defined
 * array bounds will warn, but continue to work properly.  This means that your 
 * programs can both overrun the bounds on the right *and* the left.  You're welcome.
 * Cells are not actually bytes, but ints.  However wraparound is provided at +255
 * and 0.
 */
var Interpreter = function(stdin, stdout, memoryLength){
    this.cells  = Array(memoryLength === undefined ? 30000 : memoryLength); //Default to the traditional 30,000 cells if unspecified
    this.dptr   = 0; //Our current index in the array
    this.stdin  = stdin; //Read input from here
    this.stdout = stdout; //Send output here
    this.script = "";
    this.iptr   = 0; //Our current location in the program
    this.cycles = 0; //The number of steps executed thus far
    this.blocks = Array(); //Store the number of loops we're in and where the loop began

    this.setScript = function(script){
        if(this.checkScript(script)){
            this.script = script;
            this.cells = Array(this.cells.length);
            this.dptr = 0;
            this.iptr = 0;
            this.cycles = 0;
            return true;
        }
        return false;
    };

    /*
     * checkScript
     * 
     *   Make sure each "[" has a matching "]".
     */
    this.checkScript = function(script){
        var braces = 0;
        for(var i=0; i < script.length; i++){
            if(script[i] == "["){
                braces++;
            } else if(script[i] == "]"){
                if(--braces < 0)
                    return false;
            }
        }

        return braces == 0;
    };

    /*
     * doStep
     * 
     *   Update the state of the interpreter by one step.
     */
    this.doStep = function(){
        if(this.iptr >= this.script.length){
            //TODO: Halt
            return false;
        }

        switch(this.script[this.iptr]){
            case ">":
                ++this.dptr;
                break;
            case "<":
                --this.dptr;
                break;
            case "+":
                if(this.cells[this.dptr] === undefined) this.cells[this.dptr] = 0;
                ++this.cells[this.dptr];
                break;
            case "-":
                if(this.cells[this.dptr] === undefined) this.cells[this.dptr] = 0;
                --this.cells[this.dptr];
                break;
            case ".":
                console.log(String.fromCharCode(this.cells[this.dptr]));
                break;
            case ",":
                //TODO: read char
                break;
            case "[":
                this.openBlock();
                break;
            case "]":
                this.closeBlock();
                break;
            default:
                //all non-command characters are comments, do nothing
                ++this.iptr;
                return true;
        }
        ++this.iptr;
        ++this.cycles;

        return true;
    };

    this.openBlock = function(){
        //If the dptr is on a zero value, skip the loop
        if(this.cells[this.dptr] == 0){
            var skipClose = 0;
            for(var i=this.iptr+1; i < this.script.length; i++){
                if(this.script[i] == '['){
                    skipClose++;
                } else if(this.script[i] == ']'){
                    if(this.skipClose == 0){ //we've found the appropriate closing block
                        this.iptr = i;
                        return true;
                    } else {
                        skipClose--;
                    }
                }
            }
            return false; //overran the length of the script and didn't find a closing block, validate is broken
        } else { //on nonzero we store the start of the block
            this.blocks.push(this.iptr);
        }
        return true;
    };

    this.repeatBlock = function(){
        this.iptr = this.blocks[this.blocks.length-1];  //reset the instruction pointer to the start of the block
        return true;
    };

    this.closeBlock = function(){
        if(this.cells[this.dptr] != 0){
            return this.repeatBlock();
        } else {
            this.blocks.pop();
        }
        return true;
    };
};

    