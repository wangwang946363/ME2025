//Ans
let answer = Math.floor(Math.random() * 101);
let count = 0;

document.getElementById("guessBtn").addEventListener("click", function() 
{
    let userGuess = document.getElementById("guessInput").value;
    userGuess = Number(userGuess);
    count++;

})