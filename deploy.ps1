# BlogSystem 快速部署脚本
# 在本地 PowerShell 执行

Write-Host "=== BlogSystem 快速部署 ===" -ForegroundColor Green

$SERVER = "43.136.32.75"
$USER = "root"
$PROJECT_PATH = "/home/www/BlogSystem"
$LOCAL_PATH = "C:\Users\Administrator\Desktop\Code\BolgSystem"

# 1. 上传后端文件
Write-Host "`n1. 上传后端文件..." -ForegroundColor Yellow
scp "$LOCAL_PATH\server\server.js" "${USER}@${SERVER}:${PROJECT_PATH}/server/"
scp "$LOCAL_PATH\server\package.json" "${USER}@${SERVER}:${PROJECT_PATH}/server/"
scp "$LOCAL_PATH\server\package-lock.json" "${USER}@${SERVER}:${PROJECT_PATH}/server/"

# 2. 上传前端源文件
Write-Host "`n2. 上传前端源文件..." -ForegroundColor Yellow
scp "$LOCAL_PATH\client\package.json" "${USER}@${SERVER}:${PROJECT_PATH}/client/"
scp "$LOCAL_PATH\client\src\App.jsx" "${USER}@${SERVER}:${PROJECT_PATH}/client/src/"
scp "$LOCAL_PATH\client\src\components\Login.jsx" "${USER}@${SERVER}:${PROJECT_PATH}/client/src/components/"
scp "$LOCAL_PATH\client\src\components\Layout.jsx" "${USER}@${SERVER}:${PROJECT_PATH}/client/src/components/"
scp "$LOCAL_PATH\client\src\components\Posts.jsx" "${USER}@${SERVER}:${PROJECT_PATH}/client/src/components/"
scp "$LOCAL_PATH\client\src\components\Posts.css" "${USER}@${SERVER}:${PROJECT_PATH}/client/src/components/"
scp "$LOCAL_PATH\client\src\components\Gallery.jsx" "${USER}@${SERVER}:${PROJECT_PATH}/client/src/components/"
scp "$LOCAL_PATH\client\src\components\Gallery.css" "${USER}@${SERVER}:${PROJECT_PATH}/client/src/components/"

# 3. 上传 update-server.sh 脚本
Write-Host "`n3. 上传部署脚本..." -ForegroundColor Yellow
scp "$LOCAL_PATH\update-server.sh" "${USER}@${SERVER}:${PROJECT_PATH}/"

# 4. 上传前端构建产物
Write-Host "`n4. 打包并上传前端..." -ForegroundColor Yellow
cd "$LOCAL_PATH\client"
if (Test-Path dist) {
    Compress-Archive -Path "dist\*" -DestinationPath "dist.zip" -Force
    scp "dist.zip" "${USER}@${SERVER}:${PROJECT_PATH}/client/"
    Remove-Item "dist.zip"
}

Write-Host "`n=== 文件上传完成 ===" -ForegroundColor Green
Write-Host "请在服务器上执行以下命令完成部署：" -ForegroundColor Cyan
Write-Host "cd /home/www/BlogSystem" -ForegroundColor White
Write-Host "bash update-server.sh" -ForegroundColor White
