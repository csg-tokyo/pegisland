export const exampleSource = `function make_cmp_f(x)
{
    if (x == 0)
	func = lambda (y) {
	    if (y > x) {
		result = "positive";
	    }
	    else if (y < x) {
		result = "negative";
	    }
	    else {
		result = "zero";
	    }
	    result;
	};
    else 
        func = lambda (y) {
	    0;
	};
    func;
}

compare = make_cmp_f(0);
compare(1);
`;

export const exampleGrammar = `program <- spacing program_sea*
program_sea <- if_else_stmt / water
water <- STRING / .
if_else_stmt <- if_stmt (ELSE stmt)?
if_stmt <- IF LPAREN expr RPAREN stmt
stmt <- block / if_else_stmt / exp_stmt
exp_stmt <- expr SEMICOLON
block <- LBRACE stmt* RBRACE
expr <- <expr_lake>*
<expr_lake> <- if_else_stmt / expr_water
expr_water <- LPAREN <expr_lake>* RPAREN / block

spacing        <- [ \\t\\n]*
LPAREN         <- '(' spacing
RPAREN         <- ')' spacing 
LBRACE         <- '{' spacing
RBRACE         <- '}' spacing
SEMICOLON      <- ';' spacing 
IF             <- 'if' spacing
ELSE           <- 'else' spacing
STRING         <-  '"' [^"]* '"' spacing 
`;
