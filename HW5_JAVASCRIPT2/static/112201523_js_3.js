let answer;
let guessCount;
let startTime;
let timerInterval;
let gameOver = false;
let roundCount = 1;

function startGame()
{
    answer = Math.floor(Math.random() * 101);
    guessCount = 0;
    startTime = null;
    gameOver = false;
    document.getElementById("hint").textContent = "";
    document.getElementById("timer").textContent = "0";
    document.getElementById("round").textContent = `第 ${roundCount} 輪`;
    clearInterval(timerInterval);
}

function startTimer()
{
    startTime = new Date();
    timerInterval = setInterval(() => 
        {
            let elapsed = ((new Date()) - startTime) / 1000;
            document.getElementById("timer").textContent = elapsed.toFixed(2);
        }, 100);
}

function makeGuess()
{
    if (gameOver) return; //遊戲結束後不能再猜

    let guess = parseInt(document.getElementById("guessInput").value);
    if (isNaN(guess))
    {
        document.getElementById("hint").textContent = "請輸入數字。";
        return;
    }

    if (!startTime) startTimer(); //第一次猜開始計時
    guessCount++;

    if (guess === answer)
    {
        let elapsed = ((new Date()) - startTime) / 1000;
        clearInterval(timerInterval);
        gameOver = true;
        document.getElementById("hint").textContent = `恭喜答對，答案是 ${answer} 。`;
        alert(`答對了，共猜了 ${guessCount} 次，耗時 ${elapsed.toFixed(2)} 秒。`);
        //新增紀錄
        let record = document.createElement("p");
        record.textContent = `第 ${roundCount} 輪：猜了 ${guessCount} 次，耗時 ${elapsed.toFixed(2)} 秒，時間 ${new Date().toLocaleTimeString()}`;
        document.getElementById("records").appendChild(record);
        //下一輪
        roundCount++;
        setTimeout(startGame, 500);
    }
    else if (guess < answer)
    {
        document.getElementById("hint").textContent = "太小了再試一次。";
    }
    else
    {
        document.getElementById("hint").textContent = "太大了再試一次。";
    }
}

//初始化
window.onload = startGame;