Attribute VB_Name = "modValidaciones"
Option Explicit

' Contador público compartido por los formularios.
Public contador As Long

Private Const COLOR_ADVERTENCIA As Long = 10284031 ' RGB(255, 235, 156)

Public Sub ReiniciarContador()
    contador = 0
End Sub

Public Function ValidarRequerido(ByVal control As Object) As Boolean
    If Trim$(CStr(control.Value)) = vbNullString Then
        contador = contador + 1
        control.BackColor = RGB(255, 235, 156)
        ValidarRequerido = False
    Else
        control.BackColor = VbWhite
        ValidarRequerido = True
    End If
End Function

Public Function ValidarCorreo(ByVal cajaCorreo As Object) As Boolean
    Dim correo As String
    correo = Trim$(CStr(cajaCorreo.Value))

    If correo Like "*@*.*" And InStr(1, correo, " ") = 0 Then
        cajaCorreo.BackColor = VbWhite
        ValidarCorreo = True
    Else
        contador = contador + 1
        cajaCorreo.BackColor = RGB(255, 235, 156)
        ValidarCorreo = False
    End If
End Function

Public Function ValidarNumero(ByVal cajaNumero As Object) As Boolean
    If IsNumeric(Trim$(CStr(cajaNumero.Value))) Then
        cajaNumero.BackColor = VbWhite
        ValidarNumero = True
    Else
        contador = contador + 1
        cajaNumero.BackColor = RGB(255, 235, 156)
        ValidarNumero = False
    End If
End Function

Public Function ValidarFecha(ByVal cajaFecha As Object) As Boolean
    If IsDate(Trim$(CStr(cajaFecha.Value))) Then
        cajaFecha.BackColor = VbWhite
        ValidarFecha = True
    Else
        contador = contador + 1
        cajaFecha.BackColor = RGB(255, 235, 156)
        ValidarFecha = False
    End If
End Function

Public Function ValidarSeleccion(ByVal opcionSeleccionada As Boolean, ByVal controlVisual As Object) As Boolean
    If opcionSeleccionada Then
        controlVisual.BackColor = VbWhite
        ValidarSeleccion = True
    Else
        contador = contador + 1
        controlVisual.BackColor = RGB(255, 235, 156)
        ValidarSeleccion = False
    End If
End Function

Public Function SiguienteItem(ByVal hoja As Worksheet) As Long
    Dim ultimo As Double

    On Error Resume Next
    ultimo = Application.WorksheetFunction.Max(hoja.Range("B:B"))
    On Error GoTo 0

    SiguienteItem = CLng(ultimo) + 1
End Function

Public Function CodigoDesdeItem(ByVal item As Long) As String
    CodigoDesdeItem = "A" & Format$(item, "000")
End Function

Public Function NivelEstudio(ByVal formulario As Object) As String
    If formulario.OptionButton1.Value Then NivelEstudio = "NO ESTUDIO": Exit Function
    If formulario.OptionButton2.Value Then NivelEstudio = "PRIMARIA": Exit Function
    If formulario.OptionButton3.Value Then NivelEstudio = "SECUNDARIA": Exit Function
    If formulario.OptionButton4.Value Then NivelEstudio = "SUPERIOR"
End Function
