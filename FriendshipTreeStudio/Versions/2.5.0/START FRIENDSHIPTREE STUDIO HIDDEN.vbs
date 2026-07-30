Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "C:\Users\Joe\FriendshipTree\FriendshipTreeStudio"
cmd = "cmd.exe /c npm start --"
For Each arg In WScript.Arguments
  cmd = cmd & " """ & Replace(arg, """", """""") & """"
Next
shell.Run cmd, 0, False
