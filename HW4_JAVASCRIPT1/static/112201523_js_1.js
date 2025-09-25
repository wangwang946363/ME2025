//Ans
let answer = Math.floor(Math.random() * 101);
let count = 0;

document.getElementById("guessBtn").addEventListener("click", function() 
{
    let userGuess = document.getElementById("guessInput").value;
    userGuess = Number(userGuess);
    count++;

    if(isNaN(userGuess))
    {
        alert("請輸入數字 : ");
        return;
    }
    if(userGuess > answer)
    {
        alert("太大了，請再試一次。")
    }
    else if(userGuess < answer)
    {
        alert("太小了，請再試一次。")
    }
    else
    {
        alert("恭喜答對!你總共猜了" + count + "次。");
        answer = Math.floor(Math.random() * 101);
        count = 0;
    }
});