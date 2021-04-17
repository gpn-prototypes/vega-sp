#!/bin/bash

#image config
[[ -z $DOCKER_REGISTRY ]] && DOCKER_REGISTRY="local"
[[ -z $OCP_NAMESPACE ]] && OCP_NAMESPACE="tech-vega"

IMAGE_NAME="js-base"
VERSION="1"

export JS_BASE="${DOCKER_REGISTRY}/${OCP_NAMESPACE}/${IMAGE_NAME}:${VERSION}"

[[ -z $NPM_URI ]] && NPM_URI="npm.pkg.github.com" 

return 0