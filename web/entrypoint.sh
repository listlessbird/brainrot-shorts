#!/bin/sh

sanitize_var_name() {
    echo "$1" | sed 's/[^a-zA-Z0-9_]/_/g' | sed 's/^[0-9]/_&/'
}

for secret_file in /run/secrets/*; do
    if [ -f "$secret_file" ]; then
        secret_name=$(basename "$secret_file")
        
        env_var_name=$(sanitize_var_name "$secret_name")
        
        secret_value=$(cat "$secret_file" | tr -d '\r')
        
        export "$env_var_name=$secret_value"
        
        echo "Exported: $env_var_name"
    fi
done

for var in $(env | grep '^NEXT_PUBLIC_'); do
    echo "$var"
done

# echo "=== All Environment Variables ==="
# env

exec "$@"