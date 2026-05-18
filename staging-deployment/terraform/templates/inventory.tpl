[staging_app]
%{ for idx, h in hosts ~}
app-${idx + 1} ansible_host=${h} ansible_user=${admin_user}
%{ endfor ~}

[staging_app:vars]
ansible_python_interpreter=/usr/bin/python3
env=staging
