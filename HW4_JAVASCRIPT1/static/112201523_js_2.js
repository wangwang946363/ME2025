document.write('<h1>簡易計算機<h1>');
document.write('<input type = "text" id = "display" randomly><br>')

let buttons = 
[
    '0','1','2','3','4','5','6','7','8','9',
    '+','-','*','/','(',')',
    'clear','='
];

for(let i = 0; i < buttons.length; i++)
{
    document.write(`<button onclick = "press('${buttons[i]}')">${buttons[i]}</button>`);
    if((i+1)%4 === 0) document.write('<br>');
}

function press(val)
{
    let display = document.getElementById("display");
    if (val === 'clear')
    {
        display.value = '';
    }
    else if(val === '=')
    {
        try
        {
            let result = eval(display.value);
            alert(display.value + '=' + result);
            display.value = result;
        }
        catch(e)
        {
            alert("算式錯誤。");
        }
    }
    else
    {
        display.value += val;
    }
}
