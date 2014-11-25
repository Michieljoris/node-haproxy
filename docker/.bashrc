# ~/.bashrc: executed by bash(1) for non-login shells.
# see /usr/share/doc/bash/examples/startup-files (in the package bash-doc)
# for examples

# If not running interactively, don't do anything
[ -z "$PS1" ] && return

# don't put duplicate lines in the history. See bash(1) for more options
# ... or force ignoredups and ignorespace
HISTCONTROL=ignoredups:ignorespace

# append to the history file, don't overwrite it
shopt -s histappend

# for setting history length see HISTSIZE and HISTFILESIZE in bash(1)
HISTSIZE=1000
HISTFILESIZE=2000

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# set variable identifying the chroot you work in (used in the prompt below)
if [ -z "$debian_chroot" ] && [ -r /etc/debian_chroot ]; then
    debian_chroot=$(cat /etc/debian_chroot)
fi

# If this is an xterm set the title to user@host:dir
case "$TERM" in
xterm*|rxvt*)
    PS1="\[\e]0;${debian_chroot:+($debian_chroot)}\u@\h: \w\a\]$PS1"
    ;;
*)
    ;;
esac


# Colorize grep
if echo hello|grep --color=auto l >/dev/null 2>&1; then
  export GREP_OPTIONS="--color=auto" GREP_COLOR="1;31"
fi

# Shell
export CLICOLOR="1"
if [ -f ~/scripts/git-prompt.sh ]; then
  source ~/scripts/git-prompt.sh
  export GIT_PS1_SHOWDIRTYSTATE="1"
  export PS1="\[\033[40m\]\[\033[33m\][ \u@\H:\[\033[32m\]\w\$(__git_ps1 \" \[\033[35m\]{\[\033[36m\]%s\[\033[35m\]}\")\[\033[33m\] ]$\[\033[0m\] "
else
  export PS1="\[\033[40m\]\[\033[33m\][ \u@\H:\[\033[32m\]\w\[\033[33m\] ]$\[\033[0m\] "
fi
export LS_COLORS="di=34:ln=35:so=32:pi=33:ex=1;40:bd=34;40:cd=34;40:su=0;40:sg=0;40:tw=0;40:ow=0;40:"

# Git
source ~/scripts/git-completion.sh

# Z
source ~/scripts/z.sh


# from my bashrc

# Don't use ^D to exit
set -o ignoreeof

# When changing directory small typos can be ignored by bash
# for example, cd /vr/lgo/apaache would find /var/log/apache
shopt -s cdspell

# Ignore some controlling instructions
# HISTIGNORE is a colon-delimited list of patterns which should be excluded.
# The '&' is a special pattern which suppresses duplicate entries.
# export HISTIGNORE=$'[ \t]*:&:[fb]g:exit'
export HISTIGNORE=$'[ \t]*:&:[fb]g:exit:ls' # Ignore the ls command as well
#
# Whenever displaying the prompt, write the previous line to disk
export PROMPT_COMMAND="history -a"

export PATH=$PATH:~/bin

export HISTTIMEFORMAT='%F %T '

set -o vi

#So that we can start node with rlwrap and have vi mode
export NODE_NO_READLINE=1

# b) function cd_func
# This function defines a 'cd' replacement function capable of keeping, 
# displaying and accessing history of visited directories, up to 10 entries.
# To use it, uncomment it, source this file and try 'cd --'.
# acd_func 1.0.5, 10-nov-2004
# Petar Marinov, http:/geocities.com/h2428, this is public domain
 cd_func ()
 {
   local x2 the_new_dir adir index
   local -i cnt
 
   if [[ $1 ==  "--" ]]; then
     dirs -v
     return 0
   fi
 
   the_new_dir=$1
   [[ -z $1 ]] && the_new_dir=$HOME
 
   if [[ ${the_new_dir:0:1} == '-' ]]; then
     #
     # Extract dir N from dirs
     index=${the_new_dir:1}
     [[ -z $index ]] && index=1
     adir=$(dirs +$index)
     [[ -z $adir ]] && return 1
     the_new_dir=$adir
   fi
 
   #
   # '~' has to be substituted by ${HOME}
   [[ ${the_new_dir:0:1} == '~' ]] && the_new_dir="${HOME}${the_new_dir:1}"
 
   #
   # Now change to the new dir and add to the top of the stack
   pushd "${the_new_dir}" > /dev/null
   [[ $? -ne 0 ]] && return 1
   the_new_dir=$(pwd)
 
   #
   # Trim down everything beyond 11th entry
   popd -n +11 2>/dev/null 1>/dev/null
 
   #
   # Remove any other occurence of this dir skipping the top of the stack
   for ((cnt=1; cnt <= 10; cnt++)); do
     x2=$(dirs +${cnt} 2>/dev/null)
     [[ $? -ne 0 ]] && return 0
     [[ ${x2:0:1} == '~' ]] && x2="${HOME}${x2:1}"
     if [[ "${x2}" == "${the_new_dir}" ]]; then
       popd -n +$cnt 2>/dev/null 1>/dev/null
       cnt=cnt-1
     fi
   done
 
   return 0
 }
# 
# Alias definitions.
# You may want to put all your additions into a separate file like
# ~/.bash_aliases, instead of adding them here directly.
# See /usr/share/doc/bash-doc/examples in the bash-doc package.

if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi

# enable programmable completion features (you don't need to enable
# this, if it's already enabled in /etc/bash.bashrc and /etc/profile
# sources /etc/bash.bashrc).
#if [ -f /etc/bash_completion ] && ! shopt -oq posix; then
#    . /etc/bash_completion
#fi

#
# .bashrc
#
# Aliases and Functions
#

alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# alias ls='ls -hFG'
alias l='ls -lF'
alias ll='ls -alF'
alias lt='ls -ltrF'
alias ll='ls -alF'
alias lls='ls -alSrF'
alias llt='ls -altrF'

alias tarc='tar cvf'
alias tarcz='tar czvf'
alias tarx='tar xvf'
alias tarxz='tar xvzf'

alias g='git'
alias less='less -R'
alias os='lsb_release -a'
alias vi='vim'

# Colorize directory listing
# alias ls="ls -ph --color=auto"

alias cd=cd_func
alias ll='ls -l --color'
alias la='ls -a --color'
alias lal='ls -la --color'
alias ls='ls --group-directories-first --color'
alias l='ls'
alias c='. c.sh'

alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

alias pg='ps ax | grep'
alias sb='source ~/.bashrc' 


alias node='rlwrap node'


# Default to human readable figures
 alias df='df -h'
 alias du='du -h'
#
 
