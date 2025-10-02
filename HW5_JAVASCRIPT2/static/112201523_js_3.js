let answer;
let guessCount;
let startTime;
let timerInterval;
let gameOver = false;

function startGame()
{
    answer = Math.floor(Math.random() * 101);
    guessCount = 0;
    startTime = null;
    gameOver = false;
    document.getElementById("hint").textContent = "";
    document.getElementById("timer").textContent = "0";
    clearInterval(timerInterval);
}