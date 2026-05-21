#!/usr/bin/env bash
# vagrant-provision.sh
# רץ פעם אחת אחרי `vagrant up`. מתקין את כל הכלים הדרושים לפיתוח על Ubuntu 22.04.

set -euxo pipefail

echo "===== מעדכן apt ====="
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "===== מתקין כלי בסיס ====="
sudo apt-get install -y \
  curl \
  ca-certificates \
  gnupg \
  lsb-release \
  git \
  build-essential \
  python3 \
  unzip \
  jq \
  postgresql-client \
  redis-tools

echo "===== מתקין Docker Engine ====="
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker vagrant

echo "===== מתקין Node 22 (דרך nvm) ====="
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
# טען nvm לסשן הנוכחי
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"
nvm install 22
nvm alias default 22
nvm use default

echo "===== מתקין pnpm ====="
npm i -g pnpm@latest

echo "===== הגדרות סביבה ל-vagrant ====="
# טען nvm אוטומטית בכל login
if ! grep -q 'NVM_DIR' /home/vagrant/.bashrc; then
  cat >> /home/vagrant/.bashrc <<'EOF'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# הודעת ברוכים-הבאים
if [ -d "$HOME/catering/dev-bootstrap" ]; then
  echo ""
  echo "ברוכים הבאים ל-VM של קייטרינג טעימים!"
  echo "להתחלה:"
  echo "  cd ~/catering/dev-bootstrap && ./scripts/start-dev.sh"
  echo ""
fi
EOF
fi

echo "===== ✓ provisioning הושלם ====="
echo "התחברו עם: vagrant ssh"
echo "ואז:       cd ~/catering/dev-bootstrap && ./scripts/start-dev.sh"
