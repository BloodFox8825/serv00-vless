#!/bin/bash

# 目标主机名/IP和端口
HOST="xxx.xxx.xxx"
PORT=""
# SSH用户名和密码
USERNAME=""
PASSWORD=""
# 主机上vless脚本所在的目录
APP_PATH=""
# 服务在线的标识符
ECHO_RESPONSE="/echo"

# 使用curl获取HTTP状态码和响应体
response=$(curl -s -i "http://$HOST:$PORT/echo")

#echo "$response"
#echo "----------"
echo "Service detecting..."
# 提取HTTP状态码
http_status=$(echo "$response" | grep -o '^HTTP/[0-9\.]* [0-9]*' | awk '{print $2}')
#echo "$http_status"
# 检查HTTP状态码
if [[ -n "$http_status" && "$http_status" =~ ^[0-9]+$ && "$http_status" -eq 200 ]]; then
    # 使用grep和正则表达式提取响应体
    response_body=$(echo "$response" | sed -n '/^\r$/,$p' | sed '1d')

#    echo "$response_body"
#    echo "----------"

    # 检查响应体是否包含服务在线的标识符
    if [ "$response_body" == "$ECHO_RESPONSE" ]; then
        echo "Service is online and responded with expected content."
    else
        echo "Service is online but did not return the expected response."
    fi
else
    echo "Service is not online, attempting to start it via SSH..."
    # 使用sshpass通过SSH执行命令，这里用的是pm2，如果你用别的方式启动，请自行修改
    sshpass -p "$PASSWORD" ssh "$USERNAME@$HOST" "cd $APP_PATH && ~/.npm-global/bin/pm2 start app.js --name vless"

    # 检查SSH命令是否执行成功
    if [ $? -eq 0 ]; then
        echo "Service started successfully via SSH."
    else
        echo "Failed to start service via SSH."
    fi
fi
