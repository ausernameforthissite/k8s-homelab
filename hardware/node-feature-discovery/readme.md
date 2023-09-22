
# Node Feature Discovery

References:
- https://github.com/kubernetes-sigs/node-feature-discovery#node-feature-discovery
- https://kubernetes-sigs.github.io/node-feature-discovery/master/deployment/helm.html

# Generate config

You only need to do this when updating the app.

```bash
helm repo add nfd https://kubernetes-sigs.github.io/node-feature-discovery/charts
helm repo update nfd
helm search repo nfd/node-feature-discovery --versions --devel | head
helm show values nfd/node-feature-discovery > ./hardware/node-feature-discovery/default-values.yaml

helm install nfd/node-feature-discovery --namespace $NFD_NS --create-namespace --generate-name
```

```bash
helm template \
  nfd \
  nfd/node-feature-discovery \
  --version 0.14.1 \
  --namespace nfd \
  --values ./hardware/node-feature-discovery/values.yaml \
  | sed -e '\|helm.sh/chart|d' -e '\|# Source:|d' -e '\|app.kubernetes.io/managed-by|d' -e '\|app.kubernetes.io/part-of|d' \
  > ./hardware/node-feature-discovery/nfd.gen.yaml
```

```bash
crd_url=https://github.com/kubernetes-sigs/node-feature-discovery/raw/v0.14.1/deployment/helm/node-feature-discovery/crds/nfd-api-crds.yaml
curl -fsSL "$crd_url" --output ./hardware/node-feature-discovery/crd.yaml
```

# Deploy

```bash
kl apply -f ./hardware/node-feature-discovery/crd.yaml --server-side

kl create ns nfd
kl apply -f ./hardware/node-feature-discovery/nfd.gen.yaml

kl -n nfd get pod

# check that nfd deployment updated node labels
kl describe node | grep feature.node.kubernetes.io
```

# Cleanup

```bash
kl delete -f ./hardware/node-feature-discovery/nfd.gen.yaml
kl delete -f ./hardware/node-feature-discovery/nfd.gen.yaml
kl delete ns nfd
```