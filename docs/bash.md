
# Add bashrc directory

Enable using `~/.bashrc.d` for adjustments.

```bash
mkdir -p ~/.bashrc.d/
 grep "add support for bashrc.d" ~/.bashrc || cat << "EOF" >> ~/.bashrc
# add support for bashrc.d
if [ -d ~/.bashrc.d ]; then
  for rc in ~/.bashrc.d/*; do
    if [ -f "$rc" ]; then
      . "$rc"
    fi
  done
fi
EOF
```

# Settings for new users

When creating a new user, contents of `/etc/skel/` directory are copied into the user home folder.
You can adjust `.bashrc` and other files in that directory to change the default settings.

# Bash autocomplete tweaks

```bash
 cat << "EOF" > ~/.inputrc
# Respect default shortcuts.
$include /etc/inputrc

# search history by prefix
## arrow up
"\e[A":history-search-backward
## arrow down
"\e[B":history-search-forward

set completion-ignore-case on
# add / to dirs and * to executables
set visible-stats on
set colored-stats On
set mark-symlinked-directories On
# you don't need to press tab twice to show all options
set show-all-if-ambiguous on
set show-all-if-unmodified On
# avoid repeating prefix when in a folder with many similar files
set completion-prefix-display-length 3
EOF
```

References:
- https://www.ukuug.org/events/linux2003/papers/bash_tips/
- https://man.archlinux.org/man/readline.3
- https://tiswww.cwru.edu/php/chet/readline/readline.html

# Bash prompt

This is just an opinionated convenient prompt:
- Username and host at the beginning
- Full path with the last firectory highlighted
- Current date and time
- Number of background jobs if any
- Exit code if not zero
- Command on a separate line, so you don't depend on the length of current path

Example: `user@host:/path/to/current/directory # 2000-01-01 15:10:30 # ! jobs: 1  $? == 130 `.

```bash
 cat << "EOF" > ~/.bashrc.d/0-prompt.sh
term_reset="$(tput sgr0)"
# term_reset='\[\e[0m\]'
term_bold="$(tput bold)"
term_dim="$(tput dim)"
term_underscore="$(tput smul)"
term_red="$(tput setaf 1)"
term_green="$(tput setaf 2)"
term_yellow="$(tput setaf 3)"
term_magenta="$(tput setaf 5)"
term_cyan="$(tput setaf 6)"
term_white="$(tput setaf 7)"
term_standout="$(tput smso)"

__prompt_command() {
  # $? check needs to be the first command
  local prev_exit="$?"
  history -a

  # PS1="$term_reset"
  PS1="\n"
  PS1+="${debian_chroot:+($debian_chroot)}"
  # user
  PS1+="$term_yellow\u$term_reset"
  PS1+="$term_bold@$term_reset"
  # host
  PS1+="$term_magenta\H$term_reset"

  PS1+=":"

  # path
  dir=${PWD/#${HOME//'/'/'\/'}/\~}
  if [ ! "$dir" = "~" ]; then
    PS1+="$term_green${dir%\/*}/$term_reset"
  fi
  PS1+="$term_green$term_bold${dir/*\/}$term_reset"

  # time
  PS1+=" $term_yellow# \D{%F %T} #$term_reset"

  PS1+='$([ \j -gt 0 ] && echo " $term_cyan$term_bold! jobs: \j$term_reset")'

  if [ $prev_exit != 0 ]; then
    PS1+=" $term_red$term_bold$term_standout \\\$? == $prev_exit $term_reset"
  fi

  PS1+="\n"
  PS1+="\\\$ "
  # alt: make $ yellow and bold
  # PS1+='\[\e[1;33m\]'"\\\$ "'\[\e[0m\]'
}
PROMPT_COMMAND=__prompt_command
EOF
```

References:
- `tput`: https://web.archive.org/web/20230405000510/https://wiki.bash-hackers.org/scripting/terminalcodes
- `tput`: https://tldp.org/HOWTO/Bash-Prompt-HOWTO/x405.html
- ps1 escape letters: https://tldp.org/HOWTO/Bash-Prompt-HOWTO/bash-prompt-escape-sequences.html
- If you want to see what `tput` actually uses: `tput setaf 3 | cat -v`
- - https://unix.stackexchange.com/questions/274453/is-there-any-objective-benefit-to-escape-sequences-over-tput

# Better `ls`

```bash
# use more and better colors for LS
curl -fsSL "https://github.com/trapd00r/LS_COLORS/raw/refs/heads/master/lscolors.sh" > ~/.bashrc.d/0-ls-colors.sh

# add more default args
 cat << "EOF" > ~/.bashrc.d/0-better-ls.sh
if ls --color -d . >/dev/null 2>&1; then  # GNU ls
  export COLUMNS  # Remember columns for subprocesses.
  eval "$(dircolors)"
  function ls {
    # command ls -F -h --color=always -v --author --time-style=long-iso -C "$@" | less -R -X -F
    command ls -F -h --color=always -v --author --time-style=long-iso -C "$@"
  }
  alias ll='ls -la'
  alias l='ls -la'
fi
EOF
```

References:
- https://www.topbug.net/blog/2016/11/28/a-better-ls-command/
- https://github.com/trapd00r/LS_COLORS

# Docker completion

```bash
sudo curl https://raw.githubusercontent.com/docker/docker-ce/master/components/cli/contrib/completion/bash/docker -o /etc/bash_completion.d/docker.sh
```

# kind completion

```bash
source <(kind completion bash)
```

# Print CPU temperature without external tools

```bash
paste <(cat /sys/class/thermal/thermal_zone*/type) <(cat /sys/class/thermal/thermal_zone*/temp) | column -s $'\t' -t | sed 's/\(.\)..$/.\1°C/'
```
